# Users | Zep Documentation

**Source URL:** https://help.getzep.com/users  
**Scraped:** 2025-08-29 13:00:09

---

## Overview

A User represents an individual interacting with your application. Each User can have multiple Threads associated with them, allowing you to track and manage their interactions over time. Additionally, each user has an associated User Graph which stores the memory for that user.

The unique identifier for each user is their `UserID`. This can be any string value, such as a username, email address, or UUID.

In the following sections, you will learn how to manage Users and their associated Threads.

##### 

**Users Enable Simple User Privacy Management**

Deleting a User will delete all Threads and thread artifacts associated with that User with a single API call, making it easy to handle Right To Be Forgotten requests.

## Ensuring Your User Data Is Correctly Mapped to the Zep Knowledge Graph

##### 

Adding your user’s `email`, `first_name`, and `last_name` ensures that chat messages and business data are correctly mapped to the user node in the Zep knowledge graph.

For e.g., if business data contains your user’s email address, it will be related directly to the user node.

You can associate rich business context with a User:

  * `user_id`: A unique identifier of the user that maps to your internal User ID.
  * `email`: The user’s email.
  * `first_name`: The user’s first name.
  * `last_name`: The user’s last name.

## Adding a User

You can add a new user by providing the user details.

PythonTypeScript
    
    
    1| from zep_cloud.client import Zep  
    ---|---  
    2|   
    3| client = Zep(api_key=API_KEY)  
    4|   
    5| new_user = client.user.add(  
    6|     user_id=user_id,  
    7|     email="[[email protected]](/cdn-cgi/l/email-protection)",  
    8|     first_name="Jane",  
    9|     last_name="Smith",  
    10| )  
  
> Learn how to associate [Threads with Users](/threads)

## Getting a User

You can retrieve a user by their ID.

PythonTypeScript
    
    
    1| user = client.user.get("user123")  
    ---|---  
  
## Updating a User

You can update a user’s details by providing the updated user details.

PythonTypeScript
    
    
    1| updated_user = client.user.update(  
    ---|---  
    2|     user_id=user_id,  
    3|     email="[[email protected]](/cdn-cgi/l/email-protection)",  
    4|     first_name="Jane",  
    5|     last_name="Smith",  
    6| )  
  
## Deleting a User

You can delete a user by their ID.

PythonTypeScript
    
    
    1| client.user.delete("user123")  
    ---|---  
  
## Getting a User’s Threads

You can retrieve all Threads for a user by their ID.

PythonTypeScript
    
    
    1| threads = client.user.get_threads("user123")  
    ---|---  
  
## Listing Users

You can list all users, with optional limit and cursor parameters for pagination.

PythonTypeScript
    
    
    1| # List the first 10 users  
    ---|---  
    2| result = client.user.list_ordered(page_size=10, page_number=1)  
  
## Get the User Node

You can also retrieve the user’s node from their graph:

PythonTypeScript
    
    
    1| results = client.user.get_node(user_id=user_id)  
    ---|---  
    2| user_node = results.node  
    3| print(user_node.summary)  
  
The user node might be used to get a summary of the user or to get facts related to the user (see [“How to find facts relevant to a specific node”](/cookbook/how-to-find-facts-relevant-to-a-specific-node)).
