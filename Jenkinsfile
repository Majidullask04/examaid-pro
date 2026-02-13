stage('Deploy to Server') {
            steps {
                script {
                    echo 'Deploying...'
                    sh "docker stop examaid-app || true"
                    sh "docker rm examaid-app || true"
                    // Pull the latest to be sure
                    sh "docker pull majid04/examaid-pro:latest"
                    // Run with a name Jenkins can easily find
                    sh "docker run -d -p 3000:3000 --name examaid-app majid04/examaid-pro:latest"
                }
            }
        }
        
        stage('Health Check') {
            steps {
                script {
                    echo 'Waiting for app...'
                    sleep 10
                    // This command will pass if the container is "Up"
                    sh "docker ps -f name=examaid-app"
                }
            }
        }
