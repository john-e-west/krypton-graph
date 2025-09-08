# Install SDKs | Zep Documentation

**Source URL:** https://help.getzep.com/v3/install-sdks  
**Scraped:** 2025-08-29 13:01:30

---

This guide will help you obtain an API key, install the SDK, and initialize the Zep client.

## Obtain an API Key

[Create a free Zep account](https://app.getzep.com/) and you will be prompted to create an API key.

## Install the SDK

### Python

Set up your Python project, ideally with [a virtual environment](https://medium.com/@vkmauryavk/managing-python-virtual-environments-with-uv-a-comprehensive-guide-ac74d3ad8dff), and then:

###### pip

###### uv
    
    
    $| pip install zep-cloud  
    ---|---  
  
### TypeScript

Set up your TypeScript project and then:

###### npm

###### yarn

###### pnpm
    
    
    $| npm install @getzep/zep-cloud  
    ---|---  
  
### Go

Set up your Go project and then:
    
    
    $| go get github.com/getzep/zep-go/v3  
    ---|---  
  
## Initialize the Client

First, make sure you have a .env file with your API key:
    
    
    ZEP_API_KEY=your_api_key_here  
    ---  
  
After creating your .env file, you’ll need to source it in your terminal session:
    
    
    $| source .env  
    ---|---  
  
Then, initialize the client with your API key:

PythonTypeScriptGo
    
    
    1| import os  
    ---|---  
    2| from zep_cloud.client import Zep  
    3|   
    4| API_KEY = os.environ.get('ZEP_API_KEY')  
    5|   
    6| client = Zep(  
    7|     api_key=API_KEY,  
    8| )  
  
##### 

**The Python SDK Supports Async Use**

The Python SDK supports both synchronous and asynchronous usage. For async operations, import `AsyncZep` instead of `Zep` and remember to `await` client calls in your async code.
