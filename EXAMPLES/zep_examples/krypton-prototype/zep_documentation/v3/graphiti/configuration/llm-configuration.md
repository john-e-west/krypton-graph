# LLM Configuration | Zep Documentation

**Source URL:** https://help.getzep.com/v3/graphiti/configuration/llm-configuration  
**Scraped:** 2025-08-29 13:02:21

---

##### 

Graphiti works best with LLM services that support Structured Output (such as OpenAI and Gemini). Using other services may result in incorrect output schemas and ingestion failures, particularly when using smaller models.

Graphiti defaults to using OpenAI for LLM inference and embeddings, but supports multiple LLM providers including Azure OpenAI, Google Gemini, Anthropic, Groq, and local models via Ollama. This guide covers configuring Graphiti with alternative LLM providers.

## Azure OpenAI

##### 

**Azure OpenAI v1 API Opt-in Required for Structured Outputs**

Graphiti uses structured outputs via the `client.beta.chat.completions.parse()` method, which requires Azure OpenAI deployments to opt into the v1 API. Without this opt-in, you’ll encounter 404 Resource not found errors during episode ingestion.

To enable v1 API support in your Azure OpenAI deployment, follow Microsoft’s guide: [Azure OpenAI API version lifecycle](https://learn.microsoft.com/en-us/azure/ai-foundry/openai/api-version-lifecycle?tabs=key#api-evolution).

Azure OpenAI deployments often require different endpoints for LLM and embedding services, and separate deployments for default and small models.

### Installation
    
    
    $| pip install graphiti-core  
    ---|---  
  
### Configuration
    
    
    1| from openai import AsyncAzureOpenAI  
    ---|---  
    2| from graphiti_core import Graphiti  
    3| from graphiti_core.llm_client import LLMConfig, OpenAIClient  
    4| from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig  
    5| from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient  
    6|   
    7| # Azure OpenAI configuration - use separate endpoints for different services  
    8| api_key = "<your-api-key>"  
    9| api_version = "<your-api-version>"  
    10| llm_endpoint = "<your-llm-endpoint>"  # e.g., "https://your-llm-resource.openai.azure.com/"  
    11| embedding_endpoint = "<your-embedding-endpoint>"  # e.g., "https://your-embedding-resource.openai.azure.com/"  
    12|   
    13| # Create separate Azure OpenAI clients for different services  
    14| llm_client_azure = AsyncAzureOpenAI(  
    15|     api_key=api_key,  
    16|     api_version=api_version,  
    17|     azure_endpoint=llm_endpoint  
    18| )  
    19|   
    20| embedding_client_azure = AsyncAzureOpenAI(  
    21|     api_key=api_key,  
    22|     api_version=api_version,  
    23|     azure_endpoint=embedding_endpoint  
    24| )  
    25|   
    26| # Create LLM Config with your Azure deployment names  
    27| azure_llm_config = LLMConfig(  
    28|     small_model="gpt-4.1-nano",  
    29|     model="gpt-4.1-mini",  
    30| )  
    31|   
    32| # Initialize Graphiti with Azure OpenAI clients  
    33| graphiti = Graphiti(  
    34|     "bolt://localhost:7687",  
    35|     "neo4j",  
    36|     "password",  
    37|     llm_client=OpenAIClient(  
    38|         config=azure_llm_config,  
    39|         client=llm_client_azure  
    40|     ),  
    41|     embedder=OpenAIEmbedder(  
    42|         config=OpenAIEmbedderConfig(  
    43|             embedding_model="text-embedding-3-small-deployment"  # Your Azure embedding deployment name  
    44|         ),  
    45|         client=embedding_client_azure  
    46|     ),  
    47|     cross_encoder=OpenAIRerankerClient(  
    48|         config=LLMConfig(  
    49|             model=azure_llm_config.small_model  # Use small model for reranking  
    50|         ),  
    51|         client=llm_client_azure  
    52|     )  
    53| )  
  
Make sure to replace the placeholder values with your actual Azure OpenAI credentials and deployment names.

### Environment Variables

Azure OpenAI can also be configured using environment variables:

  * `AZURE_OPENAI_ENDPOINT` \- Azure OpenAI LLM endpoint URL
  * `AZURE_OPENAI_DEPLOYMENT_NAME` \- Azure OpenAI LLM deployment name
  * `AZURE_OPENAI_API_VERSION` \- Azure OpenAI API version
  * `AZURE_OPENAI_EMBEDDING_API_KEY` \- Azure OpenAI Embedding deployment key (if different from `OPENAI_API_KEY`)
  * `AZURE_OPENAI_EMBEDDING_ENDPOINT` \- Azure OpenAI Embedding endpoint URL
  * `AZURE_OPENAI_EMBEDDING_DEPLOYMENT_NAME` \- Azure OpenAI embedding deployment name
  * `AZURE_OPENAI_EMBEDDING_API_VERSION` \- Azure OpenAI embedding API version
  * `AZURE_OPENAI_USE_MANAGED_IDENTITY` \- Use Azure Managed Identities for authentication

## Google Gemini

Google’s Gemini models provide excellent structured output support and can be used for LLM inference, embeddings, and cross-encoding/reranking.

### Installation
    
    
    $| pip install "graphiti-core[google-genai]"  
    ---|---  
  
### Configuration
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2| from graphiti_core.llm_client.gemini_client import GeminiClient, LLMConfig  
    3| from graphiti_core.embedder.gemini import GeminiEmbedder, GeminiEmbedderConfig  
    4| from graphiti_core.cross_encoder.gemini_reranker_client import GeminiRerankerClient  
    5|   
    6| # Google API key configuration  
    7| api_key = "<your-google-api-key>"  
    8|   
    9| # Initialize Graphiti with Gemini clients  
    10| graphiti = Graphiti(  
    11|     "bolt://localhost:7687",  
    12|     "neo4j",  
    13|     "password",  
    14|     llm_client=GeminiClient(  
    15|         config=LLMConfig(  
    16|             api_key=api_key,  
    17|             model="gemini-2.0-flash"  
    18|         )  
    19|     ),  
    20|     embedder=GeminiEmbedder(  
    21|         config=GeminiEmbedderConfig(  
    22|             api_key=api_key,  
    23|             embedding_model="embedding-001"  
    24|         )  
    25|     ),  
    26|     cross_encoder=GeminiRerankerClient(  
    27|         config=LLMConfig(  
    28|             api_key=api_key,  
    29|             model="gemini-2.0-flash-exp"  
    30|         )  
    31|     )  
    32| )  
  
The Gemini reranker uses the `gemini-2.0-flash-exp` model by default, which is optimized for cost-effective and low-latency classification tasks.

### Environment Variables

Google Gemini can be configured using:

  * `GOOGLE_API_KEY` \- Your Google API key

## Anthropic

Anthropic’s Claude models can be used for LLM inference with OpenAI embeddings and reranking.

##### 

When using Anthropic for LLM inference, you still need an OpenAI API key for embeddings and reranking functionality. Make sure to set both `ANTHROPIC_API_KEY` and `OPENAI_API_KEY` environment variables.

### Installation
    
    
    $| pip install "graphiti-core[anthropic]"  
    ---|---  
  
### Configuration
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2| from graphiti_core.llm_client.anthropic_client import AnthropicClient, LLMConfig  
    3| from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig  
    4| from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient  
    5|   
    6| # Configure Anthropic LLM with OpenAI embeddings and reranking  
    7| graphiti = Graphiti(  
    8|     "bolt://localhost:7687",  
    9|     "neo4j",   
    10|     "password",  
    11|     llm_client=AnthropicClient(  
    12|         config=LLMConfig(  
    13|             api_key="<your-anthropic-api-key>",  
    14|             model="claude-sonnet-4-20250514",  
    15|             small_model="claude-3-5-haiku-20241022"  
    16|         )  
    17|     ),  
    18|     embedder=OpenAIEmbedder(  
    19|         config=OpenAIEmbedderConfig(  
    20|             api_key="<your-openai-api-key>",  
    21|             embedding_model="text-embedding-3-small"  
    22|         )  
    23|     ),  
    24|     cross_encoder=OpenAIRerankerClient(  
    25|         config=LLMConfig(  
    26|             api_key="<your-openai-api-key>",  
    27|             model="gpt-4.1-nano"  # Use a smaller model for reranking  
    28|         )  
    29|     )  
    30| )  
  
### Environment Variables

Anthropic can be configured using:

  * `ANTHROPIC_API_KEY` \- Your Anthropic API key
  * `OPENAI_API_KEY` \- Required for embeddings and reranking

## Groq

Groq provides fast inference with various open-source models, using OpenAI for embeddings and reranking.

##### 

When using Groq, avoid smaller models as they may not accurately extract data or output the correct JSON structures required by Graphiti. Use larger, more capable models like Llama 3.1 70B for best results.

### Installation
    
    
    $| pip install "graphiti-core[groq]"  
    ---|---  
  
### Configuration
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2| from graphiti_core.llm_client.groq_client import GroqClient, LLMConfig  
    3| from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig  
    4| from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient  
    5|   
    6| # Configure Groq LLM with OpenAI embeddings and reranking  
    7| graphiti = Graphiti(  
    8|     "bolt://localhost:7687",  
    9|     "neo4j",  
    10|     "password",   
    11|     llm_client=GroqClient(  
    12|         config=LLMConfig(  
    13|             api_key="<your-groq-api-key>",  
    14|             model="llama-3.1-70b-versatile",  
    15|             small_model="llama-3.1-8b-instant"  
    16|         )  
    17|     ),  
    18|     embedder=OpenAIEmbedder(  
    19|         config=OpenAIEmbedderConfig(  
    20|             api_key="<your-openai-api-key>",  
    21|             embedding_model="text-embedding-3-small"  
    22|         )  
    23|     ),  
    24|     cross_encoder=OpenAIRerankerClient(  
    25|         config=LLMConfig(  
    26|             api_key="<your-openai-api-key>",  
    27|             model="gpt-4.1-nano"  # Use a smaller model for reranking  
    28|         )  
    29|     )  
    30| )  
  
### Environment Variables

Groq can be configured using:

  * `GROQ_API_KEY` \- Your Groq API key
  * `OPENAI_API_KEY` \- Required for embeddings

## Ollama (Local LLMs)

Ollama enables running local LLMs and embedding models via its OpenAI-compatible API, ideal for privacy-focused applications or avoiding API costs.

##### 

When using Ollama, avoid smaller local models as they may not accurately extract data or output the correct JSON structures required by Graphiti. Use larger, more capable models and ensure they support structured output for reliable knowledge graph construction.

### Installation

First, install and configure Ollama:
    
    
    $| # Install Ollama (visit https://ollama.ai for installation instructions)  
    ---|---  
    >| # Then pull the models you want to use:  
    >| ollama pull deepseek-r1:7b     # LLM  
    >| ollama pull nomic-embed-text   # embeddings  
  
### Configuration
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2| from graphiti_core.llm_client.config import LLMConfig  
    3| from graphiti_core.llm_client.openai_client import OpenAIClient  
    4| from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig  
    5| from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient  
    6|   
    7| # Configure Ollama LLM client  
    8| llm_config = LLMConfig(  
    9|     api_key="abc",  # Ollama doesn't require a real API key  
    10|     model="deepseek-r1:7b",  
    11|     small_model="deepseek-r1:7b",  
    12|     base_url="http://localhost:11434/v1",  # Ollama provides this port  
    13| )  
    14|   
    15| llm_client = OpenAIClient(config=llm_config)  
    16|   
    17| # Initialize Graphiti with Ollama clients  
    18| graphiti = Graphiti(  
    19|     "bolt://localhost:7687",  
    20|     "neo4j",  
    21|     "password",  
    22|     llm_client=llm_client,  
    23|     embedder=OpenAIEmbedder(  
    24|         config=OpenAIEmbedderConfig(  
    25|             api_key="abc",  
    26|             embedding_model="nomic-embed-text",  
    27|             embedding_dim=768,  
    28|             base_url="http://localhost:11434/v1",  
    29|         )  
    30|     ),  
    31|     cross_encoder=OpenAIRerankerClient(client=llm_client, config=llm_config),  
    32| )  
  
Ensure Ollama is running (`ollama serve`) and that you have pulled the models you want to use.

## OpenAI Compatible Services

Many LLM providers offer OpenAI-compatible APIs. Use the `OpenAIGenericClient` for these services, which ensures proper schema injection for JSON output since most providers don’t support OpenAI’s structured output format.

##### 

When using OpenAI-compatible services, avoid smaller models as they may not accurately extract data or output the correct JSON structures required by Graphiti. Choose larger, more capable models that can handle complex reasoning and structured output.

### Installation
    
    
    $| pip install graphiti-core  
    ---|---  
  
### Configuration
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2| from graphiti_core.llm_client.openai_generic_client import OpenAIGenericClient  
    3| from graphiti_core.llm_client.config import LLMConfig  
    4| from graphiti_core.embedder.openai import OpenAIEmbedder, OpenAIEmbedderConfig  
    5| from graphiti_core.cross_encoder.openai_reranker_client import OpenAIRerankerClient  
    6|   
    7| # Configure OpenAI-compatible service  
    8| llm_config = LLMConfig(  
    9|     api_key="<your-api-key>",  
    10|     model="<your-main-model>",        # e.g., "mistral-large-latest"  
    11|     small_model="<your-small-model>", # e.g., "mistral-small-latest"  
    12|     base_url="<your-base-url>",       # e.g., "https://api.mistral.ai/v1"  
    13| )  
    14|   
    15| # Initialize Graphiti with OpenAI-compatible service  
    16| graphiti = Graphiti(  
    17|     "bolt://localhost:7687",  
    18|     "neo4j",  
    19|     "password",  
    20|     llm_client=OpenAIGenericClient(config=llm_config),  
    21|     embedder=OpenAIEmbedder(  
    22|         config=OpenAIEmbedderConfig(  
    23|             api_key="<your-api-key>",  
    24|             embedding_model="<your-embedding-model>", # e.g., "mistral-embed"  
    25|             base_url="<your-base-url>",  
    26|         )  
    27|     ),  
    28|     cross_encoder=OpenAIRerankerClient(  
    29|         config=LLMConfig(  
    30|             api_key="<your-api-key>",  
    31|             model="<your-small-model>",  # Use smaller model for reranking  
    32|             base_url="<your-base-url>",  
    33|         )  
    34|     )  
    35| )  
  
Replace the placeholder values with your actual service credentials and model names.
