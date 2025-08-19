# CloudSimulator

A BIOS-style AWS cloud services simulator that provides an interactive learning environment for AWS CLI commands.

## Overview

CloudSimulator presents AWS services in a retro BIOS interface style, allowing users to explore and practice AWS CLI commands in a safe, simulated environment. Each service provides common AWS CLI commands that can be executed to see mock responses.

## Features

- **BIOS-Style Interface**: Retro blue BIOS design with grid layout for services
- **Interactive Terminal**: Click-to-execute commands with simulated AWS CLI responses
- **12 AWS Services**: EC2, S3, RDS, Lambda, VPC, IAM, CloudWatch, SNS, SQS, CloudFormation, API Gateway, DynamoDB
- **Mock Responses**: Realistic JSON and text responses for learning purposes
- **Keyboard Navigation**: ESC key for navigation
- **Modular Design**: Separated CSS and JavaScript files for maintainability

## Architecture

### Files Structure
```
templates/cloudsimulator.html    # Main HTML template
static/cloudsimulator.css        # BIOS-style CSS
static/cloudsimulator.js         # Interactive functionality
```

### JavaScript Architecture
The `CloudSimulator` object is designed with small, testable functions:

- `getServiceData()`: Returns AWS service configurations
- `generateResourceId()`: Creates mock resource IDs
- `getCurrentTimestamp()`: Returns current ISO timestamp
- `generateMockOutput()`: Creates command-specific mock responses
- `openService()`: Displays service terminal interface
- `executeCommand()`: Simulates AWS CLI command execution
- `closeTerminal()`: Closes service interface

## AWS Services Included

1. **EC2** - Elastic Compute Cloud (instances, security groups)
2. **S3** - Simple Storage Service (buckets, objects)
3. **RDS** - Relational Database Service (databases, snapshots)
4. **Lambda** - Serverless Compute (functions, invocation)
5. **VPC** - Virtual Private Cloud (networks, subnets)
6. **IAM** - Identity & Access Management (users, roles, policies)
7. **CloudWatch** - Monitoring & Logging (metrics, logs)
8. **SNS** - Simple Notification Service (topics, subscriptions)
9. **SQS** - Simple Queue Service (queues, messages)
10. **CloudFormation** - Infrastructure as Code (stacks, templates)
11. **API Gateway** - API Management (APIs, deployments)
12. **DynamoDB** - NoSQL Database (tables, items)

## Usage

1. Access the CloudSimulator page
2. Click on any AWS service card
3. Select AWS CLI commands to execute
4. View simulated responses
5. Use ESC to navigate back

## Educational Purpose

This simulator is designed for:
- AWS CLI learning and practice
- Understanding AWS service relationships
- Safe experimentation with commands
- Retro computing nostalgia

## Note

This is a simulation environment - no actual AWS resources are created or modified.