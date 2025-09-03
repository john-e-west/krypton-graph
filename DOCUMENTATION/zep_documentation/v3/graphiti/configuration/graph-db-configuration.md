# Graph Database Configuration | Zep Documentation

**Source URL:** https://help.getzep.com/v3/graphiti/configuration/graph-db-configuration  
**Scraped:** 2025-08-29 13:02:16

---

Graphiti supports multiple graph database backends. This guide covers installation and configuration options for each supported database across different deployment scenarios.

## Neo4j

Neo4j is the primary graph database backend for Graphiti. Version 5.26 or higher is required for full functionality.

### Neo4j Community Edition

Neo4j Community Edition is free and suitable for development, testing, and smaller production workloads.

#### Installation via Neo4j Desktop

The simplest way to install Neo4j is via [Neo4j Desktop](https://neo4j.com/download/), which provides a user-friendly interface to manage Neo4j instances and databases.

  1. Download and install Neo4j Desktop
  2. Create a new project
  3. Add a new database (Local DBMS)
  4. Set a password for the `neo4j` user
  5. Start the database

#### Docker Installation

For containerized deployments:
    
    
    $| docker run \  
    ---|---  
    >|     --name neo4j-community \  
    >|     -p 7474:7474 -p 7687:7687 \  
    >|     -e NEO4J_AUTH=neo4j/your_password \  
    >|     -e NEO4J_PLUGINS='["apoc"]' \  
    >|     neo4j:5.26-community  
  
#### Configuration

Set the following environment variables:
    
    
    $| export NEO4J_URI=bolt://localhost:7687  
    ---|---  
    >| export NEO4J_USER=neo4j  
    >| export NEO4J_PASSWORD=your_password  
  
#### Connection in Python
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2|   
    3| graphiti = Graphiti(  
    4|     neo4j_uri="bolt://localhost:7687",  
    5|     neo4j_user="neo4j",  
    6|     neo4j_password="your_password"  
    7| )  
  
### Neo4j AuraDB (Cloud)

Neo4j AuraDB is a fully managed cloud service that handles infrastructure, backups, and updates automatically.

#### Setup

  1. Sign up for [Neo4j Aura](https://neo4j.com/cloud/platform/aura-graph-database/)
  2. Create a new AuraDB instance
  3. Note down the connection URI and credentials
  4. Download the connection details or copy the connection string

#### Configuration

AuraDB connections use the `neo4j+s://` protocol for secure connections:
    
    
    $| export NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io  
    ---|---  
    >| export NEO4J_USER=neo4j  
    >| export NEO4J_PASSWORD=your_generated_password  
  
#### Connection in Python
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2|   
    3| graphiti = Graphiti(  
    4|     neo4j_uri="neo4j+s://your-instance.databases.neo4j.io",  
    5|     neo4j_user="neo4j",  
    6|     neo4j_password="your_generated_password"  
    7| )  
  
##### 

AuraDB instances automatically include APOC procedures. No additional configuration is required for most Graphiti operations.

### Neo4j Enterprise Edition

Neo4j Enterprise Edition provides advanced features including clustering, hot backups, and performance optimizations.

#### Installation

Enterprise Edition requires a commercial license. Installation options include:

  * **Neo4j Desktop** : Add Enterprise Edition license key
  * **Docker** : Use `neo4j:5.26-enterprise` image with license
  * **Server Installation** : Download from Neo4j website with valid license

#### Docker with Enterprise Features
    
    
    $| docker run \  
    ---|---  
    >|     --name neo4j-enterprise \  
    >|     -p 7474:7474 -p 7687:7687 \  
    >|     -e NEO4J_AUTH=neo4j/your_password \  
    >|     -e NEO4J_PLUGINS='["apoc"]' \  
    >|     -e NEO4J_ACCEPT_LICENSE_AGREEMENT=yes \  
    >|     neo4j:5.26-enterprise  
  
#### Parallel Runtime Configuration

Enterprise Edition supports parallel runtime for improved query performance:
    
    
    $| export USE_PARALLEL_RUNTIME=true  
    ---|---  
  
##### 

The `USE_PARALLEL_RUNTIME` feature is only available in Neo4j Enterprise Edition and larger AuraDB instances. It is not supported in Community Edition or smaller AuraDB instances.

#### Connection in Python
    
    
    1| import os  
    ---|---  
    2| from graphiti_core import Graphiti  
    3|   
    4| # Enable parallel runtime for Enterprise Edition  
    5| os.environ['USE_PARALLEL_RUNTIME'] = 'true'  
    6|   
    7| graphiti = Graphiti(  
    8|     neo4j_uri="bolt://localhost:7687",  
    9|     neo4j_user="neo4j",  
    10|     neo4j_password="your_password"  
    11| )  
  
## FalkorDB

FalkorDB configuration requires version 1.1.2 or higher.

### Docker Installation

The simplest way to run FalkorDB is via Docker:
    
    
    $| docker run -p 6379:6379 -p 3000:3000 -it --rm falkordb/falkordb:latest  
    ---|---  
  
This command:

  * Exposes FalkorDB on port 6379 (Redis protocol)
  * Provides a web interface on port 3000
  * Runs in foreground mode for easy testing

### Configuration

Set the following environment variables for FalkorDB (optional):
    
    
    $| export FALKORDB_HOST=localhost          # Default: localhost  
    ---|---  
    >| export FALKORDB_PORT=6379              # Default: 6379  
    >| export FALKORDB_USERNAME=              # Optional: usually not required  
    >| export FALKORDB_PASSWORD=              # Optional: usually not required  
  
### Connection in Python
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2| from graphiti_core.driver.falkordb_driver import FalkorDriver  
    3|   
    4| # FalkorDB connection using FalkorDriver  
    5| falkor_driver = FalkorDriver(  
    6|     host='localhost',        # or os.environ.get('FALKORDB_HOST', 'localhost')  
    7|     port='6379',            # or os.environ.get('FALKORDB_PORT', '6379')  
    8|     username=None,          # or os.environ.get('FALKORDB_USERNAME', None)  
    9|     password=None           # or os.environ.get('FALKORDB_PASSWORD', None)  
    10| )  
    11|   
    12| graphiti = Graphiti(graph_driver=falkor_driver)  
  
##### 

FalkorDB uses a dedicated `FalkorDriver` and connects via Redis protocol on port 6379. Unlike Neo4j, authentication is typically not required for local FalkorDB instances.

## Neptune DB

Neptune DB is Amazon’s fully managed graph database service that supports both property graph and RDF data models. Graphiti integrates with Neptune to provide scalable, cloud-native graph storage with automatic backups, encryption, and high availability.

### Prerequisites

Neptune DB integration requires both Neptune and Amazon OpenSearch Serverless (AOSS) services:

  * **Neptune Service** : For graph data storage and Cypher query processing
  * **OpenSearch Serverless** : For text search and hybrid retrieval functionality
  * **AWS Credentials** : Configured via AWS CLI, environment variables, or IAM roles

For detailed setup instructions, see:

  * [AWS Neptune Developer Resources](https://aws.amazon.com/neptune/developer-resources/)
  * [Neptune Database Documentation](https://docs.aws.amazon.com/neptune/latest/userguide/)
  * [Neptune Analytics Documentation](https://docs.aws.amazon.com/neptune-analytics/latest/userguide/)
  * [OpenSearch Serverless Documentation](https://docs.aws.amazon.com/opensearch-service/latest/developerguide/serverless.html)

### Setup

  1. Create a Neptune Database cluster in the AWS Console or via CloudFormation
  2. Create an OpenSearch Serverless collection for text search
  3. Configure VPC networking and security groups to allow communication between services
  4. Note your Neptune cluster endpoint and OpenSearch collection endpoint

### Configuration

Set the following environment variables:
    
    
    $| export NEPTUNE_HOST=your-neptune-cluster.cluster-xyz.us-west-2.neptune.amazonaws.com  
    ---|---  
    >| export NEPTUNE_PORT=8182  # Optional, defaults to 8182  
    >| export AOSS_HOST=your-collection.us-west-2.aoss.amazonaws.com  
  
### Installation

Install the required dependencies:
    
    
    $| pip install graphiti-core  
    ---|---  
  
### Connection in Python
    
    
    1| import os  
    ---|---  
    2| from graphiti_core import Graphiti  
    3| from graphiti_core.driver.neptune_driver import NeptuneDriver  
    4|   
    5| # Get connection parameters from environment  
    6| neptune_uri = os.getenv('NEPTUNE_HOST')  
    7| neptune_port = int(os.getenv('NEPTUNE_PORT', 8182))  
    8| aoss_host = os.getenv('AOSS_HOST')  
    9|   
    10| # Validate required parameters  
    11| if not neptune_uri or not aoss_host:  
    12|     raise ValueError("NEPTUNE_HOST and AOSS_HOST environment variables must be set")  
    13|   
    14| # Create Neptune driver  
    15| driver = NeptuneDriver(  
    16|     host=neptune_uri,        # Required: Neptune cluster endpoint  
    17|     aoss_host=aoss_host,     # Required: OpenSearch Serverless collection endpoint  
    18|     port=neptune_port        # Optional: Neptune port (defaults to 8182)  
    19| )  
    20|   
    21| # Pass the driver to Graphiti  
    22| graphiti = Graphiti(graph_driver=driver)  
  
## Kuzu

Kuzu is an embedded graph engine that does not require any additional setup. You can enable the Kuzu driver by installing graphiti with the Kuzu extra:
    
    
    $| pip install graphiti-core[kuzu]  
    ---|---  
  
### Configuration

Set the following environment variables for Kuzu (optional):
    
    
    $| export KUZU_DB=/path/to/graphiti.kuzu          # Default: :memory:  
    ---|---  
  
### Connection in Python
    
    
    1| from graphiti_core import Graphiti  
    ---|---  
    2| from graphiti_core.driver.kuzu_driver import KuzuDriver  
    3|   
    4| # Kuzu connection using KuzuDriver  
    5| kuzu_driver = KuzuDriver(  
    6|     db='/path/to/graphiti.kuzu'        # or os.environ.get('KUZU_DB', ':memory:')  
    7| )  
    8|   
    9| graphiti = Graphiti(graph_driver=kuzu_driver)
