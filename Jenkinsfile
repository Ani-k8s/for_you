// =============================================================================
// ForYou Gym SaaS — Hardened Jenkins CI/CD Pipeline (v1.0.0)
// =============================================================================

pipeline {
    agent any

    environment {
        COMPOSE_PROJECT_NAME  = "foryou_ci_${env.BUILD_NUMBER}"
        DJANGO_SETTINGS_MODULE = "project.settings.production"
    }

    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        skipStagesAfterUnstable()
        ansiColor('xterm')
        retry(2)
    }

    stages {
        stage('Initialize & Cleanup') {
            steps {
                echo "🧹 Initializing environment and cleaning stale resources..."
                // Force cleanup of any previous failed build with same ID
                sh "docker compose -p ${COMPOSE_PROJECT_NAME} down -v --remove-orphans || true"
                // Remove unused images to free space
                sh "docker image prune -f"
            }
        }

        stage('Build Platform') {
            steps {
                echo "🏗️ Building Elite Platform (Frontend + Backend)..."
                sh "docker compose -p ${COMPOSE_PROJECT_NAME} build --pull"
            }
        }

        stage('Launch Infrastructure') {
            steps {
                echo "🚀 Booting Nexus Core..."
                sh "docker compose -p ${COMPOSE_PROJECT_NAME} up -d"
            }
        }

        stage('Wait for Neural Link (DB)') {
            steps {
                echo "⏳ Waiting for PostgreSQL Synchronization..."
                sh """
                    for i in {1..20}; do
                        if docker compose -p ${COMPOSE_PROJECT_NAME} exec db pg_isready -U postgres; then
                            echo "✅ Neural Link Established!"
                            exit 0
                        fi
                        echo "Retrying link (\$i/20)..."
                        sleep 3
                    done
                    echo "❌ Neural Link Failed!"
                    exit 1
                """
            }
        }

        stage('Strict Database Sanitization') {
            steps {
                echo "🧹 Performing Master Reset..."
                // Run migrations first
                sh "docker compose -p ${COMPOSE_PROJECT_NAME} exec backend python manage.py migrate --noinput"
                // Run the production reset script
                sh "docker compose -p ${COMPOSE_PROJECT_NAME} exec backend python scripts/reset_db.py"
            }
        }

        stage('System Health Validation') {
            steps {
                echo "🔍 Verifying Core Integrity..."
                sh """
                    for i in {1..10}; do
                        if curl -sf http://localhost:8000/api/health/; then
                            echo "✅ Core Integrity Verified!"
                            exit 0
                        fi
                        echo "Probing Core (\$i/10)..."
                        sleep 5
                    done
                    echo "❌ Core Failure Detected!"
                    exit 1
                """
            }
        }

        stage('Automated Test Protocol') {
            steps {
                echo "🧪 Running Backend Validation Suite..."
                sh "docker compose -p ${COMPOSE_PROJECT_NAME} exec backend pytest --maxfail=3"
            }
        }

        stage('Frontend Artifact Audit') {
            steps {
                echo "📦 Auditing Production Assets..."
                sh "docker compose -p ${COMPOSE_PROJECT_NAME} exec frontend ls -la /usr/share/nginx/html/index.html"
            }
        }
    }

    post {
        always {
            echo "🏁 Decommissioning CI Environment..."
            sh "docker compose -p ${COMPOSE_PROJECT_NAME} down -v --remove-orphans"
            cleanWs()
        }
        success {
            echo "✅ PROTOCOL SUCCESS: Version 1.0.0 is ready for deployment."
        }
        failure {
            echo "❌ PROTOCOL FAILURE: Build halted. Check diagnostics."
        }
    }
}
