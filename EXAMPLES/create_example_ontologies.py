"""
Create Example Ontologies for Krypton-Graph
Demonstrates ontology creation for different domains
"""

import os
import sys
import json
from datetime import datetime

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.ontology_manager import OntologyManager, EntityDefinition, EdgeDefinition

# Configuration
AIRTABLE_BASE_ID = "appvLsaMZqtLc9EIX"  # Your Krypton-Graph base
ZEP_API_KEY = os.environ.get("ZEP_API_KEY", "")


def create_healthcare_ontology(manager: OntologyManager):
    """Create a healthcare domain ontology"""
    
    # Create the ontology
    ontology_id = manager.create_ontology(
        name="Healthcare Knowledge Graph",
        domain="Healthcare",
        version="1.0",
        notes="Comprehensive healthcare ontology for patient records and medical relationships"
    )
    
    # Define entities
    entities = [
        EntityDefinition(
            entity_name="Patient",
            entity_class="healthcare.Patient",
            properties={
                "patient_id": "str",
                "name": "str",
                "age": "int",
                "gender": "str",
                "medical_record_number": "str"
            },
            validation_rules={
                "age": "0 <= age <= 150",
                "gender": "gender in ['M', 'F', 'Other']"
            },
            examples=["John Doe", "patient", "medical record", "MRN"],
            priority=1,
            description="Individual receiving medical care"
        ),
        EntityDefinition(
            entity_name="Doctor",
            entity_class="healthcare.Doctor",
            properties={
                "doctor_id": "str",
                "name": "str",
                "specialization": "str",
                "license_number": "str"
            },
            examples=["Dr. Smith", "physician", "doctor", "MD"],
            priority=2,
            description="Medical professional providing care"
        ),
        EntityDefinition(
            entity_name="Diagnosis",
            entity_class="healthcare.Diagnosis",
            properties={
                "diagnosis_code": "str",
                "description": "str",
                "icd_code": "str",
                "severity": "str"
            },
            examples=["diagnosis", "diagnosed with", "ICD-10", "condition"],
            priority=3,
            description="Medical condition or disease"
        ),
        EntityDefinition(
            entity_name="Medication",
            entity_class="healthcare.Medication",
            properties={
                "drug_name": "str",
                "dosage": "str",
                "frequency": "str",
                "route": "str"
            },
            examples=["prescribed", "medication", "drug", "dosage", "mg"],
            priority=4,
            description="Pharmaceutical treatment"
        ),
        EntityDefinition(
            entity_name="Procedure",
            entity_class="healthcare.Procedure",
            properties={
                "procedure_code": "str",
                "name": "str",
                "cpt_code": "str",
                "duration": "str"
            },
            examples=["surgery", "procedure", "operation", "treatment"],
            priority=5,
            description="Medical procedure or intervention"
        )
    ]
    
    # Add entities to ontology
    entity_ids = {}
    for entity in entities:
        entity_id = manager.add_entity_definition(ontology_id, entity)
        entity_ids[entity.entity_name] = entity_id
    
    # Define edges
    edges = [
        ("TREATS", "Doctor", "Patient", {
            "edge_name": "TREATS",
            "edge_class": "healthcare.Treats",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Doctor treats patient"
        }),
        ("HAS_DIAGNOSIS", "Patient", "Diagnosis", {
            "edge_name": "HAS_DIAGNOSIS",
            "edge_class": "healthcare.HasDiagnosis",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Patient has diagnosis"
        }),
        ("PRESCRIBED", "Doctor", "Medication", {
            "edge_name": "PRESCRIBED",
            "edge_class": "healthcare.Prescribed",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Doctor prescribed medication"
        }),
        ("TAKES", "Patient", "Medication", {
            "edge_name": "TAKES",
            "edge_class": "healthcare.Takes",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Patient takes medication"
        }),
        ("UNDERWENT", "Patient", "Procedure", {
            "edge_name": "UNDERWENT",
            "edge_class": "healthcare.Underwent",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Patient underwent procedure"
        }),
        ("PERFORMED", "Doctor", "Procedure", {
            "edge_name": "PERFORMED",
            "edge_class": "healthcare.Performed",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Doctor performed procedure"
        })
    ]
    
    # Add edges to ontology
    for edge_name, source, target, edge_config in edges:
        edge_def = EdgeDefinition(
            edge_name=edge_config["edge_name"],
            edge_class=edge_config["edge_class"],
            source_entity=source,
            target_entity=target,
            cardinality=edge_config["cardinality"],
            bidirectional=edge_config["bidirectional"],
            description=edge_config["description"]
        )
        manager.add_edge_definition(
            ontology_id, edge_def,
            entity_ids[source], entity_ids[target]
        )
    
    print(f"✅ Created Healthcare ontology: {ontology_id}")
    return ontology_id


def create_finance_ontology(manager: OntologyManager):
    """Create a finance domain ontology"""
    
    # Create the ontology
    ontology_id = manager.create_ontology(
        name="Financial Services Graph",
        domain="Finance",
        version="1.0",
        notes="Financial services ontology for transactions and account relationships"
    )
    
    # Define entities
    entities = [
        EntityDefinition(
            entity_name="Customer",
            entity_class="finance.Customer",
            properties={
                "customer_id": "str",
                "name": "str",
                "credit_score": "int",
                "kyc_status": "str"
            },
            examples=["customer", "client", "account holder"],
            priority=1,
            description="Bank customer or client"
        ),
        EntityDefinition(
            entity_name="Account",
            entity_class="finance.Account",
            properties={
                "account_number": "str",
                "account_type": "str",
                "balance": "float",
                "currency": "str"
            },
            examples=["account", "checking", "savings", "balance"],
            priority=2,
            description="Financial account"
        ),
        EntityDefinition(
            entity_name="Transaction",
            entity_class="finance.Transaction",
            properties={
                "transaction_id": "str",
                "amount": "float",
                "type": "str",
                "timestamp": "str"
            },
            examples=["transaction", "payment", "transfer", "deposit", "withdrawal"],
            priority=3,
            description="Financial transaction"
        ),
        EntityDefinition(
            entity_name="Merchant",
            entity_class="finance.Merchant",
            properties={
                "merchant_id": "str",
                "name": "str",
                "category": "str",
                "mcc_code": "str"
            },
            examples=["merchant", "vendor", "store", "retailer"],
            priority=4,
            description="Business accepting payments"
        )
    ]
    
    # Add entities
    entity_ids = {}
    for entity in entities:
        entity_id = manager.add_entity_definition(ontology_id, entity)
        entity_ids[entity.entity_name] = entity_id
    
    # Define edges
    edges = [
        ("OWNS", "Customer", "Account", {
            "edge_name": "OWNS",
            "edge_class": "finance.Owns",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Customer owns account"
        }),
        ("INITIATED", "Account", "Transaction", {
            "edge_name": "INITIATED",
            "edge_class": "finance.Initiated",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "Account initiated transaction"
        }),
        ("PAID_TO", "Transaction", "Merchant", {
            "edge_name": "PAID_TO",
            "edge_class": "finance.PaidTo",
            "cardinality": "many-to-one",
            "bidirectional": False,
            "description": "Transaction paid to merchant"
        })
    ]
    
    # Add edges
    for edge_name, source, target, edge_config in edges:
        edge_def = EdgeDefinition(
            edge_name=edge_config["edge_name"],
            edge_class=edge_config["edge_class"],
            source_entity=source,
            target_entity=target,
            cardinality=edge_config["cardinality"],
            bidirectional=edge_config["bidirectional"],
            description=edge_config["description"]
        )
        manager.add_edge_definition(
            ontology_id, edge_def,
            entity_ids[source], entity_ids[target]
        )
    
    print(f"✅ Created Finance ontology: {ontology_id}")
    return ontology_id


def create_technology_ontology(manager: OntologyManager):
    """Create a technology domain ontology"""
    
    # Create the ontology
    ontology_id = manager.create_ontology(
        name="Technology Infrastructure Graph",
        domain="Technology",
        version="1.0",
        notes="Technology infrastructure ontology for systems and dependencies"
    )
    
    # Define entities
    entities = [
        EntityDefinition(
            entity_name="System",
            entity_class="tech.System",
            properties={
                "system_id": "str",
                "name": "str",
                "version": "str",
                "status": "str"
            },
            examples=["system", "application", "service", "platform"],
            priority=1,
            description="Software system or service"
        ),
        EntityDefinition(
            entity_name="Server",
            entity_class="tech.Server",
            properties={
                "server_id": "str",
                "hostname": "str",
                "ip_address": "str",
                "location": "str"
            },
            examples=["server", "host", "instance", "node"],
            priority=2,
            description="Physical or virtual server"
        ),
        EntityDefinition(
            entity_name="Database",
            entity_class="tech.Database",
            properties={
                "db_name": "str",
                "db_type": "str",
                "size_gb": "float",
                "schema_version": "str"
            },
            examples=["database", "DB", "postgres", "mysql", "mongodb"],
            priority=3,
            description="Database instance"
        ),
        EntityDefinition(
            entity_name="API",
            entity_class="tech.API",
            properties={
                "api_name": "str",
                "version": "str",
                "protocol": "str",
                "endpoint": "str"
            },
            examples=["API", "endpoint", "REST", "GraphQL", "webhook"],
            priority=4,
            description="Application Programming Interface"
        ),
        EntityDefinition(
            entity_name="Developer",
            entity_class="tech.Developer",
            properties={
                "developer_id": "str",
                "name": "str",
                "team": "str",
                "role": "str"
            },
            examples=["developer", "engineer", "programmer", "team"],
            priority=5,
            description="Software developer or engineer"
        )
    ]
    
    # Add entities
    entity_ids = {}
    for entity in entities:
        entity_id = manager.add_entity_definition(ontology_id, entity)
        entity_ids[entity.entity_name] = entity_id
    
    # Define edges
    edges = [
        ("DEPLOYED_ON", "System", "Server", {
            "edge_name": "DEPLOYED_ON",
            "edge_class": "tech.DeployedOn",
            "cardinality": "many-to-many",
            "bidirectional": False,
            "description": "System deployed on server"
        }),
        ("USES_DATABASE", "System", "Database", {
            "edge_name": "USES_DATABASE",
            "edge_class": "tech.UsesDatabase",
            "cardinality": "many-to-many",
            "bidirectional": False,
            "description": "System uses database"
        }),
        ("EXPOSES", "System", "API", {
            "edge_name": "EXPOSES",
            "edge_class": "tech.Exposes",
            "cardinality": "one-to-many",
            "bidirectional": False,
            "description": "System exposes API"
        }),
        ("MAINTAINS", "Developer", "System", {
            "edge_name": "MAINTAINS",
            "edge_class": "tech.Maintains",
            "cardinality": "many-to-many",
            "bidirectional": False,
            "description": "Developer maintains system"
        }),
        ("DEPENDS_ON", "System", "System", {
            "edge_name": "DEPENDS_ON",
            "edge_class": "tech.DependsOn",
            "cardinality": "many-to-many",
            "bidirectional": False,
            "description": "System depends on another system"
        })
    ]
    
    # Add edges
    for edge_name, source, target, edge_config in edges:
        edge_def = EdgeDefinition(
            edge_name=edge_config["edge_name"],
            edge_class=edge_config["edge_class"],
            source_entity=source,
            target_entity=target,
            cardinality=edge_config["cardinality"],
            bidirectional=edge_config["bidirectional"],
            description=edge_config["description"]
        )
        manager.add_edge_definition(
            ontology_id, edge_def,
            entity_ids[source], entity_ids[target]
        )
    
    print(f"✅ Created Technology ontology: {ontology_id}")
    return ontology_id


def create_test_datasets(manager: OntologyManager):
    """Create test datasets for ontology validation"""
    
    datasets = [
        {
            "Dataset Name": "Healthcare Patient Record",
            "Domain": "Healthcare",
            "Content Type": "text",
            "Sample Data": """
            Patient John Doe, age 45, was admitted to the hospital on January 15, 2024.
            Dr. Smith diagnosed him with hypertension (ICD-10: I10).
            The doctor prescribed Lisinopril 10mg daily for blood pressure control.
            Patient underwent an echocardiogram procedure on January 16.
            The procedure was performed by Dr. Johnson from cardiology.
            """,
            "Expected Entities JSON": json.dumps([
                {"name": "John Doe", "type": "Patient"},
                {"name": "Dr. Smith", "type": "Doctor"},
                {"name": "Dr. Johnson", "type": "Doctor"},
                {"name": "hypertension", "type": "Diagnosis"},
                {"name": "Lisinopril", "type": "Medication"},
                {"name": "echocardiogram", "type": "Procedure"}
            ]),
            "Expected Edges JSON": json.dumps([
                {"type": "TREATS", "source": "Dr. Smith", "target": "John Doe"},
                {"type": "HAS_DIAGNOSIS", "source": "John Doe", "target": "hypertension"},
                {"type": "PRESCRIBED", "source": "Dr. Smith", "target": "Lisinopril"},
                {"type": "TAKES", "source": "John Doe", "target": "Lisinopril"},
                {"type": "UNDERWENT", "source": "John Doe", "target": "echocardiogram"},
                {"type": "PERFORMED", "source": "Dr. Johnson", "target": "echocardiogram"}
            ]),
            "Description": "Sample patient medical record with diagnosis and treatment",
            "Size": 500
        },
        {
            "Dataset Name": "Financial Transaction Log",
            "Domain": "Finance",
            "Content Type": "json",
            "Sample Data": json.dumps({
                "customer": {"id": "CUST001", "name": "Alice Johnson"},
                "account": {"number": "ACC123456", "type": "checking", "balance": 5000.00},
                "transactions": [
                    {"id": "TXN001", "amount": 150.00, "type": "payment", "merchant": "Amazon"},
                    {"id": "TXN002", "amount": 75.50, "type": "payment", "merchant": "Walmart"}
                ]
            }),
            "Expected Entities JSON": json.dumps([
                {"name": "Alice Johnson", "type": "Customer"},
                {"name": "ACC123456", "type": "Account"},
                {"name": "TXN001", "type": "Transaction"},
                {"name": "TXN002", "type": "Transaction"},
                {"name": "Amazon", "type": "Merchant"},
                {"name": "Walmart", "type": "Merchant"}
            ]),
            "Expected Edges JSON": json.dumps([
                {"type": "OWNS", "source": "Alice Johnson", "target": "ACC123456"},
                {"type": "INITIATED", "source": "ACC123456", "target": "TXN001"},
                {"type": "INITIATED", "source": "ACC123456", "target": "TXN002"},
                {"type": "PAID_TO", "source": "TXN001", "target": "Amazon"},
                {"type": "PAID_TO", "source": "TXN002", "target": "Walmart"}
            ]),
            "Description": "Financial transactions with customer and merchant relationships",
            "Size": 400
        },
        {
            "Dataset Name": "System Architecture Description",
            "Domain": "Technology",
            "Content Type": "text",
            "Sample Data": """
            The user authentication system is deployed on server AWS-EC2-001 in us-east-1.
            It uses a PostgreSQL database for storing user credentials.
            The system exposes a REST API at endpoint /api/v1/auth.
            Developer Mike Chen from the platform team maintains this system.
            The authentication system depends on the notification service for sending emails.
            """,
            "Expected Entities JSON": json.dumps([
                {"name": "user authentication system", "type": "System"},
                {"name": "AWS-EC2-001", "type": "Server"},
                {"name": "PostgreSQL", "type": "Database"},
                {"name": "/api/v1/auth", "type": "API"},
                {"name": "Mike Chen", "type": "Developer"},
                {"name": "notification service", "type": "System"}
            ]),
            "Expected Edges JSON": json.dumps([
                {"type": "DEPLOYED_ON", "source": "user authentication system", "target": "AWS-EC2-001"},
                {"type": "USES_DATABASE", "source": "user authentication system", "target": "PostgreSQL"},
                {"type": "EXPOSES", "source": "user authentication system", "target": "/api/v1/auth"},
                {"type": "MAINTAINS", "source": "Mike Chen", "target": "user authentication system"},
                {"type": "DEPENDS_ON", "source": "user authentication system", "target": "notification service"}
            ]),
            "Description": "Technology infrastructure with system dependencies",
            "Size": 350
        }
    ]
    
    # Create datasets in AirTable
    test_datasets_table = manager.test_datasets_table
    
    dataset_ids = []
    for dataset in datasets:
        record = test_datasets_table.create(dataset)
        dataset_ids.append(record['id'])
        print(f"✅ Created test dataset: {dataset['Dataset Name']} (ID: {record['id']})")
    
    return dataset_ids


def main():
    """Main function to create example ontologies"""
    
    print("🚀 Creating Example Ontologies for Krypton-Graph")
    print("=" * 50)
    
    # Initialize manager
    manager = OntologyManager(AIRTABLE_BASE_ID, ZEP_API_KEY)
    
    # Create ontologies
    print("\n📋 Creating Ontologies...")
    healthcare_id = create_healthcare_ontology(manager)
    finance_id = create_finance_ontology(manager)
    technology_id = create_technology_ontology(manager)
    
    # Create test datasets
    print("\n📊 Creating Test Datasets...")
    dataset_ids = create_test_datasets(manager)
    
    # Summary
    print("\n" + "=" * 50)
    print("✨ Example Ontologies Created Successfully!")
    print("\nOntology IDs:")
    print(f"  - Healthcare: {healthcare_id}")
    print(f"  - Finance: {finance_id}")
    print(f"  - Technology: {technology_id}")
    print(f"\nTest Datasets: {len(dataset_ids)} created")
    print("\n💡 Next Steps:")
    print("  1. Test ontologies with the test datasets")
    print("  2. Assign ontologies to users or graphs")
    print("  3. Import files to extract knowledge")


if __name__ == "__main__":
    main()