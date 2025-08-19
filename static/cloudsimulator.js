const CloudSimulator = {
    currentService: null,
    selectedIndex: 0,
    menuIndex: 0,
    isMenuMode: false,
    services: ['ec2', 's3', 'rds', 'lambda', 'vpc', 'iam', 'cloudwatch', 'sns', 'sqs', 'cloudformation', 'apigateway', 'dynamodb'],
    menuItems: ['Main', 'Advanced', 'Security', 'Power', 'Boot', 'Exit'],

    getServiceData: function() {
        return {
            ec2: {
                name: 'EC2 - Elastic Compute Cloud',
                description: 'Amazon Elastic Compute Cloud (EC2) provides scalable computing capacity in the cloud. Launch virtual servers, configure security and networking, and manage storage.',
                commands: [
                    'aws ec2 describe-instances',
                    'aws ec2 run-instances --image-id ami-12345678 --count 1 --instance-type t2.micro',
                    'aws ec2 terminate-instances --instance-ids i-1234567890abcdef0',
                    'aws ec2 describe-security-groups',
                    'aws ec2 create-security-group --group-name mysg --description "My security group"'
                ]
            },
            s3: {
                name: 'S3 - Simple Storage Service',
                description: 'Amazon Simple Storage Service provides object storage with industry-leading scalability, data availability, security, and performance.',
                commands: [
                    'aws s3 ls',
                    'aws s3 mb s3://my-bucket-name',
                    'aws s3 cp file.txt s3://my-bucket-name/',
                    'aws s3 sync ./local-folder s3://my-bucket-name/folder/',
                    'aws s3 rm s3://my-bucket-name/file.txt'
                ]
            },
            rds: {
                name: 'RDS - Relational Database Service',
                description: 'Amazon RDS makes it easy to set up, operate, and scale relational databases in the cloud with automated backups and updates.',
                commands: [
                    'aws rds describe-db-instances',
                    'aws rds create-db-instance --db-name mydb --db-instance-identifier mydb',
                    'aws rds describe-db-snapshots',
                    'aws rds create-db-snapshot --db-snapshot-identifier mydbsnapshot',
                    'aws rds delete-db-instance --db-instance-identifier mydb'
                ]
            },
            lambda: {
                name: 'Lambda - Serverless Compute',
                description: 'AWS Lambda runs code without provisioning servers. Pay only for compute time consumed with automatic scaling.',
                commands: [
                    'aws lambda list-functions',
                    'aws lambda create-function --function-name myFunction',
                    'aws lambda invoke --function-name myFunction response.json',
                    'aws lambda update-function-code --function-name myFunction',
                    'aws lambda delete-function --function-name myFunction'
                ]
            },
            vpc: {
                name: 'VPC - Virtual Private Cloud',
                description: 'Amazon VPC provides isolated cloud resources with complete control over virtual networking environment.',
                commands: [
                    'aws ec2 describe-vpcs',
                    'aws ec2 create-vpc --cidr-block 10.0.0.0/16',
                    'aws ec2 create-subnet --vpc-id vpc-12345678 --cidr-block 10.0.1.0/24',
                    'aws ec2 describe-subnets',
                    'aws ec2 delete-vpc --vpc-id vpc-12345678'
                ]
            },
            iam: {
                name: 'IAM - Identity & Access Management',
                description: 'AWS IAM securely manages access to AWS services and resources with users, groups, and permissions.',
                commands: [
                    'aws iam list-users',
                    'aws iam create-user --user-name [Enter name]',
                    'aws iam list-roles',
                    'aws iam create-role --role-name [Enter name]',
                    'aws iam attach-user-policy --user-name [user] --policy-arn [policy]',
                    'aws iam list-policies --scope Local'
                ],
                createdUsers: [],
                createdRoles: [],
                availablePolicies: [
                    'arn:aws:iam::aws:policy/ReadOnlyAccess',
                    'arn:aws:iam::aws:policy/PowerUserAccess',
                    'arn:aws:iam::aws:policy/IAMFullAccess',
                    'arn:aws:iam::aws:policy/AmazonS3FullAccess',
                    'arn:aws:iam::aws:policy/AmazonEC2FullAccess'
                ]
            },
            cloudwatch: {
                name: 'CloudWatch - Monitoring & Logging',
                description: 'Amazon CloudWatch monitors AWS resources and applications with logs, metrics, and automated actions.',
                commands: [
                    'aws cloudwatch list-metrics',
                    'aws cloudwatch get-metric-statistics --namespace AWS/EC2 --metric-name CPUUtilization',
                    'aws logs describe-log-groups',
                    'aws logs create-log-group --log-group-name mylogs',
                    'aws cloudwatch put-metric-data --namespace MyApp --metric-data MetricName=PageViews,Value=5'
                ]
            },
            sns: {
                name: 'SNS - Simple Notification Service',
                description: 'Amazon SNS coordinates and manages message delivery to subscribing endpoints and clients.',
                commands: [
                    'aws sns list-topics',
                    'aws sns create-topic --name mytopic',
                    'aws sns subscribe --topic-arn arn:aws:sns:us-east-1:123456789012:mytopic',
                    'aws sns publish --topic-arn arn:aws:sns:us-east-1:123456789012:mytopic --message "Hello"',
                    'aws sns delete-topic --topic-arn arn:aws:sns:us-east-1:123456789012:mytopic'
                ]
            },
            sqs: {
                name: 'SQS - Simple Queue Service',
                description: 'Amazon SQS provides reliable, scalable hosted queues for storing messages between applications.',
                commands: [
                    'aws sqs list-queues',
                    'aws sqs create-queue --queue-name myqueue',
                    'aws sqs send-message --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/myqueue --message-body "Hello"',
                    'aws sqs receive-message --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/myqueue',
                    'aws sqs delete-queue --queue-url https://sqs.us-east-1.amazonaws.com/123456789012/myqueue'
                ]
            },
            cloudformation: {
                name: 'CloudFormation - Infrastructure as Code',
                description: 'AWS CloudFormation provisions AWS resources using templates with predictable and repeatable deployments.',
                commands: [
                    'aws cloudformation list-stacks',
                    'aws cloudformation create-stack --stack-name mystack --template-body file://template.yaml',
                    'aws cloudformation describe-stacks --stack-name mystack',
                    'aws cloudformation update-stack --stack-name mystack --template-body file://template.yaml',
                    'aws cloudformation delete-stack --stack-name mystack'
                ]
            },
            apigateway: {
                name: 'API Gateway - API Management',
                description: 'Amazon API Gateway creates, publishes, maintains, monitors, and secures REST and WebSocket APIs.',
                commands: [
                    'aws apigateway get-rest-apis',
                    'aws apigateway create-rest-api --name myapi',
                    'aws apigateway get-resources --rest-api-id abc123',
                    'aws apigateway create-deployment --rest-api-id abc123 --stage-name prod',
                    'aws apigateway delete-rest-api --rest-api-id abc123'
                ]
            },
            dynamodb: {
                name: 'DynamoDB - NoSQL Database',
                description: 'Amazon DynamoDB provides fast, predictable performance with seamless scalability for NoSQL databases.',
                commands: [
                    'aws dynamodb list-tables',
                    'aws dynamodb create-table --table-name mytable --attribute-definitions AttributeName=id,AttributeType=S',
                    'aws dynamodb put-item --table-name mytable --item \'{"id":{"S":"123"}}\'',
                    'aws dynamodb get-item --table-name mytable --key \'{"id":{"S":"123"}}\'',
                    'aws dynamodb delete-table --table-name mytable'
                ]
            }
        };
    },

    generateResourceId: function() {
        return 'sim-' + Math.random().toString(36).substring(2, 11);
    },

    getCurrentTimestamp: function() {
        return new Date().toISOString();
    },

    generateMockListResponse: function() {
        return JSON.stringify([
            {
                "Id": this.generateResourceId(),
                "Name": "simulated-resource",
                "Status": "running",
                "CreatedTime": this.getCurrentTimestamp()
            }
        ], null, 2);
    },

    generateMockCreateResponse: function() {
        return 'Resource created successfully\nID: ' + this.generateResourceId() + '\nStatus: pending';
    },

    generateMockDeleteResponse: function() {
        return 'Resource deletion initiated\nStatus: deleting';
    },

    generateMockDefaultResponse: function() {
        return 'Command executed successfully\nStatus: completed\nTime: ' + this.getCurrentTimestamp();
    },

    generateMockOutput: function(command) {
        if (command.includes('list') || command.includes('describe')) {
            return this.generateMockListResponse();
        } else if (command.includes('create')) {
            return this.generateMockCreateResponse();
        } else if (command.includes('delete')) {
            return this.generateMockDeleteResponse();
        } else {
            return this.generateMockDefaultResponse();
        }
    },

    updateMenuSelection: function() {
        const menuItems = document.querySelectorAll('.menu-item');
        menuItems.forEach((item, index) => {
            if (index === this.menuIndex) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    },

    updateSelection: function() {
        if (this.isMenuMode) {
            this.updateMenuSelection();
            return;
        }
        
        const serviceItems = document.querySelectorAll('.service-item');
        serviceItems.forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                this.selectService(this.services[index]);
            } else {
                item.classList.remove('selected');
            }
        });
    },

    moveSelection: function(direction) {
        if (this.isMenuMode) {
            if (direction === 'left' && this.menuIndex > 0) {
                this.menuIndex--;
            } else if (direction === 'right' && this.menuIndex < this.menuItems.length - 1) {
                this.menuIndex++;
            } else if (direction === 'down') {
                this.isMenuMode = false;
                this.selectedIndex = 0;
            }
        } else {
            if (direction === 'up') {
                if (this.selectedIndex > 0) {
                    this.selectedIndex--;
                } else {
                    this.isMenuMode = true;
                    this.menuIndex = 0;
                }
            } else if (direction === 'down' && this.selectedIndex < this.services.length - 1) {
                this.selectedIndex++;
            }
        }
        this.updateSelection();
    },

    selectService: function(serviceKey) {
        const serviceData = this.getServiceData()[serviceKey];
        if (!serviceData) return;

        document.getElementById('detailServiceName').textContent = serviceData.name;
        document.getElementById('detailServiceDesc').textContent = serviceData.description;

        const commandsList = document.getElementById('commandsList');
        commandsList.innerHTML = '';
        
        serviceData.commands.forEach(cmd => {
            const cmdElement = document.createElement('div');
            cmdElement.className = 'command-item';
            cmdElement.textContent = cmd;
            cmdElement.onclick = () => this.executeCommand(cmd);
            commandsList.appendChild(cmdElement);
        });
    },

    executeCommand: function(command) {
        const output = this.generateMockOutput(command);
        this.showTerminalOutput(command, output);
    },

    showTerminalOutput: function(command, output) {
        const overlay = document.getElementById('terminalOverlay');
        const content = document.getElementById('terminalContent');
        
        let html = '<div style="color: #ffff00; font-weight: bold;">Command Output</div>';
        html += '<div style="color: #ffffff; margin: 10px 0;">Command: ' + command + '</div>';
        html += '<div style="color: #00ff00; white-space: pre-line; margin-top: 10px;">' + output + '</div>';
        html += '<div style="color: #cccccc; margin-top: 20px;">Press ESC to close</div>';
        
        content.innerHTML = html;
        overlay.style.display = 'block';
    },

    closeTerminal: function() {
        const overlay = document.getElementById('terminalOverlay');
        if (overlay) {
            overlay.style.display = 'none';
        }
    },

    handleKeydown: function(event) {
        const overlay = document.getElementById('terminalOverlay');
        
        if (overlay && overlay.style.display === 'block') {
            if (event.key === 'Escape') {
                this.closeTerminal();
            }
            return;
        }

        switch(event.key) {
            case 'ArrowUp':
                event.preventDefault();
                this.moveSelection('up');
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.moveSelection('down');
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.moveSelection('left');
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.moveSelection('right');
                break;
            case 'Enter':
                event.preventDefault();
                if (this.isMenuMode) {
                    this.handleMenuSelection();
                } else {
                    const selectedService = this.services[this.selectedIndex];
                    const serviceData = this.getServiceData()[selectedService];
                    if (serviceData && serviceData.commands.length > 0) {
                        this.executeCommand(serviceData.commands[0]);
                    }
                }
                break;
            case 'Escape':
                window.location.href = '/';
                break;
        }
    },

    handleMenuSelection: function() {
        const selectedMenu = this.menuItems[this.menuIndex];
        switch(selectedMenu) {
            case 'Main':
                // Already in main view
                break;
            case 'Advanced':
                alert('Advanced settings - Coming soon!');
                break;
            case 'Security':
                alert('Security settings - Coming soon!');
                break;
            case 'Power':
                alert('Power management - Coming soon!');
                break;
            case 'Boot':
                alert('Boot options - Coming soon!');
                break;
            case 'Exit':
                window.location.href = '/';
                break;
        }
    },

    init: function() {
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        this.updateSelection();
    }
};

CloudSimulator.init();