pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'majid04/examaid-pro' 
        REGISTRY_CRED = 'docker-hub-credentials'
        CONTAINER_NAME = 'examaid-app'
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

        stage('Deploy to Server') {
            steps {
                script {
                    echo 'Deploying to Server...'
                    // Stop and remove the old container if it exists
                    sh "docker stop $CONTAINER_NAME || true"
                    sh "docker rm $CONTAINER_NAME || true"
                    
                    // Run the new container on port 3000
                    sh "docker run -d -p 3000:3000 --name $CONTAINER_NAME $DOCKER_IMAGE:latest"
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    echo 'Checking if App is alive...'
                    sleep 5
                    // Check if the container is running in the process list
                    sh "docker ps | grep $CONTAINER_NAME"
                }
            }
        }
    }
}
