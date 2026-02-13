pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'majid04/examaid-pro' 
        REGISTRY_CRED = 'docker-hub-credentials'
        AWS_IP = '51.20.130.110'
    }

    stages {
        stage('Build Docker Image') {
            steps {
                script {
                    echo 'Building Docker Image...'
                    sh "docker build -t $DOCKER_IMAGE:latest ."
                }
            }
        }
        
        stage('Push to Docker Hub') {
            steps {
                script {
                    echo 'Pushing to Docker Hub...'
                    withCredentials([usernamePassword(credentialsId: REGISTRY_CRED, passwordVariable: 'DOCKER_PASS', usernameVariable: 'DOCKER_USER')]) {
                        sh "echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin"
                        sh "docker push $DOCKER_IMAGE:latest"
                    }
                }
            }
        }

        stage('Deploy to AWS') {
            steps {
                // This step uses the key you just saved to log into AWS
                sshagent(['ec2-server-key']) {
                    script {
                        echo "Deploying to AWS..."
                        def remote = "ubuntu@$AWS_IP"
                        
                        // 1. Pull the new image on the AWS server
                        sh "ssh -o StrictHostKeyChecking=no ${remote} 'docker pull $DOCKER_IMAGE:latest'"
                        
                        // 2. Stop and remove the old container (if running)
                        sh "ssh -o StrictHostKeyChecking=no ${remote} 'docker stop examaid-app || true'"
                        sh "ssh -o StrictHostKeyChecking=no ${remote} 'docker rm examaid-app || true'"
                        
                        // 3. Start the new container
                        sh "ssh -o StrictHostKeyChecking=no ${remote} 'docker run -d -p 3000:3000 --name examaid-app $DOCKER_IMAGE:latest'"
                    }
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    echo "Checking AWS Health..."
                    sleep 10
                    sshagent(['ec2-server-key']) {
                         def remote = "ubuntu@$AWS_IP"
                         // Check if the app is listed in the running processes
                         sh "ssh -o StrictHostKeyChecking=no ${remote} 'docker ps | grep examaid-app'"
                    }
                }
            }
        }
    }
}
