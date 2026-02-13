pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'majid04/examaid-pro' 
        REGISTRY_CRED = 'docker-hub-credentials'
        CONTAINER_NAME = 'examaid-app'
        APP_PORT = '3000'
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
                    // 1. Stop and remove the old container (if it exists)
                    // We use "|| true" so the pipeline doesn't fail if the container doesn't exist yet
                    sh "docker stop $CONTAINER_NAME || true"
                    sh "docker rm $CONTAINER_NAME || true"
                    
                    // 2. Pull the fresh image we just pushed
                    sh "docker pull $DOCKER_IMAGE:latest"
                    
                    // 3. Run the new container
                    sh "docker run -d -p $APP_PORT:3000 --name $CONTAINER_NAME $DOCKER_IMAGE:latest"
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    echo 'Checking if App is alive...'
                    // Wait 10 seconds for the app to start up
                    sleep 10
                    
                    // Check if the container is running
                    sh "docker ps | grep $CONTAINER_NAME"
                    
                    // Optional: Check if it responds to a web request (Curl)
                    // Since Jenkins is inside a container, we use the container's IP
                    sh "curl -f http://host.docker.internal:$APP_PORT || echo 'Warning: Curl failed but container is running'"
                }
            }
        }
    }
}
