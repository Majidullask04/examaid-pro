pipeline {
    agent any
    
    environment {
        DOCKER_IMAGE = 'majidullask04/examaid-pro' 
        REGISTRY_CRED = 'docker-hub-credentials'
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
    }
}
