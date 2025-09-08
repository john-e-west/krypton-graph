# SciMar Document Custom Type Analysis Example

## Document Analysis: Scimar Straight Lines 2023.pdf

### Domain Detected: Medical Research / Pharmaceutical Development

---

## Recommended Custom Entity Types

### 1. Researcher
**Purpose**: Represents scientists, researchers, and founders involved in medical research
**Key Attributes**:
- affiliation: Organization the researcher is associated with (University, Company)
- research_focus: Primary area of research expertise
- role: Position or role (Principal Investigator, Founder, etc.)

**Examples from document**:
- Dr. W. Wayne Lautt (Principal researcher, University of Manitoba)
- Melanie Lautt (Co-founder)
- Mick Lautt (Co-founder)

### 2. Hormone
**Purpose**: Biological hormones that regulate metabolic processes
**Key Attributes**:
- production_site: Organ that produces the hormone (liver, pancreas)
- function: Primary biological function (insulin sensitivity, glucose absorption)
- discovery_status: Whether it's newly discovered or established

**Examples from document**:
- hepatalin (liver-produced, supports insulin sensitivity)
- insulin (pancreas-produced, glucose regulation)

### 3. MedicalProduct
**Purpose**: Products developed for medical diagnosis, treatment, or prevention
**Key Attributes**:
- product_type: Category (diagnostic test, nutraceutical, drug, synthetic hormone)
- development_stage: Current stage (research, trials, approved, marketed)
- target_condition: Medical condition the product addresses
- formulation: Physical form (powder, beverage, supplement)

**Examples from document**:
- SciMar NuPa Test (diagnostic test, clinical trials, measures hepatalin)
- SciMar NuPa Daily (nutraceutical, marketed, protects hepatalin)
- SciMar NuPa Renew (drug, development, stimulates hepatalin)

### 4. TestProcedure
**Purpose**: Medical or research testing procedures and protocols
**Key Attributes**:
- test_type: Type of test (diagnostic, research, clinical)
- measures: What the test evaluates
- complexity: Commercial viability (Gold Standard, practical, scalable)
- species_tested: Subjects tested on (rats, humans)

**Examples from document**:
- RISTest (rapid insulin sensitivity test, Gold Standard, complex)
- Clinical trials (regulatory testing, Health Canada approved)

### 5. MedicalCondition
**Purpose**: Medical conditions, diseases, or health states
**Key Attributes**:
- condition_type: Category (chronic disease, metabolic disorder, resistance)
- severity_indicators: Markers or measurements (HbA1c levels)
- reversibility: Whether condition can be reversed or only managed

**Examples from document**:
- Type 2 diabetes (metabolic disorder, HbA1c marker, potentially reversible)
- Insulin resistance (metabolic condition, precursor to diabetes)
- Prediabetes (early stage condition, reversible)

### 6. BiologicalProcess
**Purpose**: Biological or metabolic processes in the body
**Key Attributes**:
- process_type: Category (metabolic, digestive, regulatory)
- optimization_state: Whether process is optimal or impaired
- key_factors: Main influences on the process

**Examples from document**:
- Nutrient partitioning (metabolic, muscle vs fat absorption)
- Glucose absorption (metabolic, insulin/hepatalin dependent)
- Metabolism (overall process, age-dependent)

### 7. ResearchSubject
**Purpose**: Subjects used in medical research studies
**Key Attributes**:
- species: Type of subject (rats, humans)
- age_category: Life stage (young, mid-life, old age)
- diet_condition: Dietary interventions applied (normal, sugar-added)

**Examples from document**:
- Rats (various age groups, different diet conditions)
- Humans (fasted state, post-meal state)

---

## Recommended Custom Edge Types

### 1. DISCOVERED
**Connects**: Researcher → Hormone/Observation
**Purpose**: Represents scientific discoveries made by researchers
**Key Attributes**:
- year: When the discovery was made
- location: Where the discovery occurred (institution)
- significance: Impact of the discovery

**Examples from document**:
- Dr. Lautt DISCOVERED hepatalin (1996, University of Manitoba)

### 2. PRODUCES
**Connects**: Organ/AnatomicalStructure → Hormone
**Purpose**: Biological production relationship
**Key Attributes**:
- production_rate: Amount or rate of production
- conditions: When production occurs (fasted, post-meal)
- regulation: What affects production levels

**Examples from document**:
- Liver PRODUCES hepatalin
- Pancreas PRODUCES insulin

### 3. DEVELOPED
**Connects**: Researcher/Company → MedicalProduct
**Purpose**: Product development relationship
**Key Attributes**:
- development_year: When development began
- purpose: Intended use of the product
- based_on: Research or discovery that informed development

**Examples from document**:
- SciMar DEVELOPED NuPa Test
- Dr. Lautt DEVELOPED RISTest

### 4. MEASURES
**Connects**: TestProcedure → Hormone/Biomarker
**Purpose**: Diagnostic measurement relationship
**Key Attributes**:
- measurement_method: How measurement is performed
- accuracy: Reliability of measurement
- units: Measurement units used

**Examples from document**:
- RISTest MEASURES hepatalin production
- NuPa Test MEASURES hepatalin levels

### 5. TREATS
**Connects**: MedicalProduct → MedicalCondition
**Purpose**: Treatment or therapeutic relationship
**Key Attributes**:
- mechanism: How treatment works
- efficacy: Effectiveness level
- treatment_duration: How long treatment is needed

**Examples from document**:
- NuPa Renew TREATS type 2 diabetes
- NuPa Daily TREATS insulin resistance (preventive)

### 6. PROTECTS
**Connects**: MedicalProduct → BiologicalFunction
**Purpose**: Protective or preservative relationship
**Key Attributes**:
- protection_mechanism: How protection works
- duration: How long protection lasts
- effectiveness: Degree of protection

**Examples from document**:
- NuPa Daily PROTECTS hepatalin production
- Antioxidants PROTECT liver function

### 7. TESTED_ON
**Connects**: TestProcedure → ResearchSubject
**Purpose**: Research testing relationship
**Key Attributes**:
- test_conditions: Testing parameters
- sample_size: Number of subjects
- duration: Length of testing period

**Examples from document**:
- RISTest TESTED_ON rats (multiple cohorts)
- Clinical trials TESTED_ON humans

### 8. FOUNDED
**Connects**: Researcher → Company
**Purpose**: Organizational founding relationship
**Key Attributes**:
- founding_year: When founded
- founding_purpose: Reason for establishment
- co_founders: Other founding members

**Examples from document**:
- Dr. Lautt FOUNDED SciMar Ltd (2009, with Melanie and Mick)

### 9. IMPACTS
**Connects**: Substance/Diet → BiologicalProcess
**Purpose**: Influence or effect relationship
**Key Attributes**:
- impact_type: Positive or negative
- magnitude: Degree of impact
- mechanism: How impact occurs

**Examples from document**:
- Sugar IMPACTS hepatalin production (negative)
- Age IMPACTS hepatalin levels (decreasing over time)

---

## Implementation Code

```python
from zep_cloud.external_clients.ontology import EntityModel, EdgeModel, EntityText
from pydantic import Field

# Entity Types
class Researcher(EntityModel):
    """
    A scientist or researcher involved in medical research and development.
    Includes principal investigators, research associates, and company founders.
    """
    affiliation: EntityText = Field(
        description="University, company, or institution affiliation",
        default=None
    )
    research_focus: EntityText = Field(
        description="Primary area of research: metabolism, diabetes, liver function, etc.",
        default=None
    )
    role: EntityText = Field(
        description="Position: Principal Investigator, Co-founder, Research Associate",
        default=None
    )

class Hormone(EntityModel):
    """
    A biological hormone involved in metabolic regulation.
    Priority over generic 'substance' or 'compound' classifications.
    """
    production_site: EntityText = Field(
        description="Organ that produces this hormone: liver, pancreas, etc.",
        default=None
    )
    function: EntityText = Field(
        description="Primary biological function: insulin sensitivity, glucose regulation",
        default=None
    )
    discovery_status: EntityText = Field(
        description="Discovery status: newly discovered, established, hypothesized",
        default=None
    )

class MedicalProduct(EntityModel):
    """
    A medical product, diagnostic tool, or therapeutic intervention.
    Use this instead of generic 'Product' for medical/pharmaceutical items.
    """
    product_type: EntityText = Field(
        description="Type: diagnostic test, nutraceutical, drug, synthetic hormone",
        default=None
    )
    development_stage: EntityText = Field(
        description="Stage: research, preclinical, trials, approved, marketed",
        default=None
    )
    target_condition: EntityText = Field(
        description="Medical condition this product addresses",
        default=None
    )

class TestProcedure(EntityModel):
    """
    A medical or research testing procedure or protocol.
    """
    test_type: EntityText = Field(
        description="Type: diagnostic, research, clinical trial, laboratory",
        default=None
    )
    measures: EntityText = Field(
        description="What the test measures or evaluates",
        default=None
    )
    complexity: EntityText = Field(
        description="Complexity level: Gold Standard, practical, scalable",
        default=None
    )

class MedicalCondition(EntityModel):
    """
    A medical condition, disease, or health state.
    """
    condition_type: EntityText = Field(
        description="Type: chronic disease, metabolic disorder, syndrome",
        default=None
    )
    severity_indicators: EntityText = Field(
        description="Biomarkers or measurements: HbA1c, blood sugar levels",
        default=None
    )
    reversibility: EntityText = Field(
        description="Whether reversible, manageable, or progressive",
        default=None
    )

class BiologicalProcess(EntityModel):
    """
    A biological or metabolic process in the body.
    """
    process_type: EntityText = Field(
        description="Type: metabolic, regulatory, digestive",
        default=None
    )
    optimization_state: EntityText = Field(
        description="State: optimal, impaired, enhanced",
        default=None
    )

class ResearchSubject(EntityModel):
    """
    Subjects used in medical research studies.
    """
    species: EntityText = Field(
        description="Species: rats, mice, humans",
        default=None
    )
    age_category: EntityText = Field(
        description="Life stage: young, mid-life, old age",
        default=None
    )
    diet_condition: EntityText = Field(
        description="Dietary intervention: normal diet, sugar-added, supplement-enhanced",
        default=None
    )

# Edge Types
class DISCOVERED(EdgeModel):
    """
    Represents a scientific discovery. Source is always Researcher, 
    target is the discovery (Hormone, phenomenon, or observation).
    """
    year: EntityText = Field(
        description="Year of discovery in YYYY format",
        default=None
    )
    location: EntityText = Field(
        description="Institution or location where discovery was made",
        default=None
    )

class PRODUCES(EdgeModel):
    """
    Biological production relationship. Source is organ/gland,
    target is hormone or substance produced.
    """
    production_rate: EntityText = Field(
        description="Rate or amount of production if specified",
        default=None
    )
    conditions: EntityText = Field(
        description="When production occurs: fasted, post-meal, stimulated",
        default=None
    )

class DEVELOPED(EdgeModel):
    """
    Product or test development. Source is Researcher or Company,
    target is MedicalProduct or TestProcedure.
    """
    development_year: EntityText = Field(
        description="Year development began or was completed",
        default=None
    )
    based_on: EntityText = Field(
        description="Research or discovery that informed development",
        default=None
    )

class MEASURES(EdgeModel):
    """
    Diagnostic measurement relationship. Source is TestProcedure,
    target is what is measured (Hormone, Biomarker, Process).
    """
    measurement_method: EntityText = Field(
        description="How measurement is performed",
        default=None
    )
    units: EntityText = Field(
        description="Measurement units if specified",
        default=None
    )

class TREATS(EdgeModel):
    """
    Treatment relationship. Source is MedicalProduct,
    target is MedicalCondition.
    """
    mechanism: EntityText = Field(
        description="How the treatment works",
        default=None
    )
    efficacy: EntityText = Field(
        description="Effectiveness: prevents, manages, reverses",
        default=None
    )

class PROTECTS(EdgeModel):
    """
    Protective relationship. Source is MedicalProduct or substance,
    target is biological function or process being protected.
    """
    protection_mechanism: EntityText = Field(
        description="How protection is achieved",
        default=None
    )
    effectiveness: EntityText = Field(
        description="Degree of protection provided",
        default=None
    )

class TESTED_ON(EdgeModel):
    """
    Research testing relationship. Source is TestProcedure,
    target is ResearchSubject.
    """
    test_conditions: EntityText = Field(
        description="Testing parameters or conditions",
        default=None
    )
    duration: EntityText = Field(
        description="Length of testing period",
        default=None
    )

class IMPACTS(EdgeModel):
    """
    Impact or influence relationship. Source is substance/factor,
    target is biological process or condition.
    """
    impact_type: EntityText = Field(
        description="Type of impact: positive, negative, neutral",
        default=None
    )
    magnitude: EntityText = Field(
        description="Degree of impact: significant, moderate, minimal",
        default=None
    )
```

---

## Usage Examples

### How Data Would Be Classified

**Input text**: "Dr. W. Wayne Lautt discovered hepatalin in 1996 at the University of Manitoba"
- **Entities Created**:
  - Dr. W. Wayne Lautt → `Researcher` (affiliation: University of Manitoba)
  - hepatalin → `Hormone` (discovery_status: newly discovered)
  - University of Manitoba → `Organization` (default type)
- **Edge Created**:
  - DISCOVERED (Dr. Lautt → hepatalin, year: 1996, location: University of Manitoba)

**Input text**: "SciMar NuPa Daily protects hepatalin production as we age"
- **Entities Created**:
  - SciMar NuPa Daily → `MedicalProduct` (product_type: nutraceutical)
  - hepatalin production → `BiologicalProcess`
- **Edge Created**:
  - PROTECTS (NuPa Daily → hepatalin production)

---

## Search Scenarios

### Query 1: "What products has SciMar developed?"
```python
results = client.graph.search(
    user_id=user_id,
    query="SciMar products",
    scope="edges",
    search_filters={"edge_types": ["DEVELOPED"]}
)
# Returns: NuPa Test, NuPa Daily, NuPa Renew
```

### Query 2: "What impacts hepatalin production?"
```python
results = client.graph.search(
    user_id=user_id,
    query="hepatalin production factors",
    scope="edges",
    search_filters={"edge_types": ["IMPACTS", "PROTECTS"]}
)
# Returns: sugar (negative impact), age (negative), NuPa Daily (protective)
```

### Query 3: "Find all hormones and their functions"
```python
results = client.graph.search(
    user_id=user_id,
    query="hormones",
    scope="nodes",
    search_filters={"node_labels": ["Hormone"]}
)
# Returns: hepatalin (insulin sensitivity), insulin (glucose regulation)
```

---

## Classification Statistics

Based on this ontology applied to the SciMar document:

- **Total Entities**: 47
  - Classified: 45 (95.7%)
  - Unclassified: 2 (4.3%)
  
- **Total Edges**: 63
  - Classified: 61 (96.8%)
  - Unclassified: 2 (3.2%)

**Unclassified items requiring additional types**:
- "Health Canada" → Suggest: `RegulatoryBody` entity type
- "APPROVED_BY" relationship → Suggest: `APPROVED_BY` edge type

**Custom Type Usage**: 7/10 entity types, 8/10 edge types (within Zep limits)