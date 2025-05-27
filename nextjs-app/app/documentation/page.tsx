"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Tabs, TabsContent } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Home, ChevronRight } from "lucide-react"

export default function Documentation() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("overview")

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center gap-2 mb-8">
        <Button variant="outline" size="icon" onClick={() => router.push("/")} className="h-10 w-10">
          <Home className="h-5 w-5" />
        </Button>
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">Documentation</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Documentation</CardTitle>
              <CardDescription>Learn about the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <nav className="space-y-1">
                <Button
                  variant={activeTab === "overview" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("overview")}
                >
                  Overview
                </Button>
                <Button
                  variant={activeTab === "architecture" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("architecture")}
                >
                  Architecture
                </Button>
                <Button
                  variant={activeTab === "deployment" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("deployment")}
                >
                  Deployment
                </Button>
                <Button
                  variant={activeTab === "authentication" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("authentication")}
                >
                  Authentication
                </Button>
                <Button
                  variant={activeTab === "data-storage" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("data-storage")}
                >
                  Data Storage
                </Button>
                <Button
                  variant={activeTab === "user-guide" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("user-guide")}
                >
                  User Guide
                </Button>
                <Button
                  variant={activeTab === "api" ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setActiveTab("api")}
                >
                  API Reference
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="overview" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard Platform Overview</CardTitle>
                  <CardDescription>A comprehensive business intelligence solution</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Introduction</h3>
                    <p>
                      The Analytics Dashboard Platform is a powerful business intelligence tool designed to help
                      organizations visualize, analyze, and share data insights. Built with modern technologies and
                      following best practices, it provides a secure, scalable, and user-friendly environment for data
                      analytics.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Key Features</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Interactive dashboard creation with drag-and-drop interface</li>
                      <li>Multiple chart types and visualization options</li>
                      <li>Role-based access control for secure data sharing</li>
                      <li>Customizable layouts and themes</li>
                      <li>Data source integration capabilities</li>
                      <li>Dashboard sharing and collaboration features</li>
                      <li>Access request workflow for controlled data access</li>
                      <li>Responsive design for desktop and mobile viewing</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Technology Stack</h3>
                    <p>
                      The platform is built using a modern technology stack that ensures performance, security, and
                      scalability:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Frontend: Next.js, React, Tailwind CSS</li>
                      <li>Backend: Node.js, Next.js API Routes</li>
                      <li>Authentication: Keycloak</li>
                      <li>Database: PostgreSQL</li>
                      <li>Object Storage: MinIO</li>
                      <li>Containerization: Docker</li>
                      <li>Orchestration: Docker Compose (development) / Kubernetes (production)</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Deployment Options</h3>
                    <p>
                      The Analytics Dashboard Platform can be deployed in various environments to suit your
                      organization's needs:
                    </p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>On-premises deployment for complete control and data sovereignty</li>
                      <li>Cloud deployment on AWS, Azure, or Google Cloud for scalability</li>
                      <li>Hybrid deployment options combining on-premises and cloud resources</li>
                    </ul>
                  </div>

                  <div className="mt-6">
                    <img
                      src="/placeholder.svg?height=300&width=600"
                      alt="Analytics Dashboard Platform Overview"
                      className="rounded-lg border"
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="architecture" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>System Architecture</CardTitle>
                  <CardDescription>Understanding the platform's components and their interactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Architecture Overview</h3>
                    <p>
                      The Analytics Dashboard Platform follows a microservices architecture, with each component
                      containerized using Docker. This approach provides modularity, scalability, and ease of
                      deployment.
                    </p>
                  </div>

                  <div className="mt-6 mb-8">
                    <img
                      src="/placeholder.svg?height=400&width=600"
                      alt="System Architecture Diagram"
                      className="rounded-lg border"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Core Components</h3>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Frontend Application</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            Next.js application that provides the user interface for dashboard creation, viewing, and
                            management. Communicates with backend services via REST APIs.
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">API Service</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            Next.js API routes that handle data processing, dashboard management, and access control.
                            Interacts with the database and other services.
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Authentication Service (Keycloak)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            Manages user authentication, authorization, and role-based access control. Provides OAuth2
                            and OpenID Connect protocols for secure authentication.
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Database (PostgreSQL)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            Stores dashboard configurations, user preferences, access control rules, and metadata.
                            Provides ACID compliance for data integrity.
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Object Storage (MinIO)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            Stores binary data such as dashboard thumbnails, exported reports, and user uploads.
                            Compatible with Amazon S3 API for easy integration.
                          </p>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base">Reverse Proxy (Nginx)</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm">
                            Handles routing, SSL termination, and load balancing. Provides a unified entry point for all
                            services and improves security.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Communication Flow</h3>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>User accesses the application through the web browser</li>
                      <li>Authentication requests are directed to Keycloak</li>
                      <li>Upon successful authentication, the user receives a JWT token</li>
                      <li>The frontend application uses the token to make authorized API requests</li>
                      <li>API services validate the token and process the requests</li>
                      <li>Data is retrieved from or stored in PostgreSQL and MinIO as needed</li>
                      <li>Results are returned to the frontend for display</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deployment" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Deployment Guide</CardTitle>
                  <CardDescription>Instructions for deploying the platform in different environments</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Prerequisites</h3>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Docker and Docker Compose installed</li>
                      <li>Minimum 4GB RAM, 2 CPU cores</li>
                      <li>20GB disk space</li>
                      <li>Internet connection for pulling Docker images</li>
                      <li>Git for cloning the repository</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Docker Compose Deployment (Development/Testing)</h3>
                    <p>The simplest way to deploy the platform is using Docker Compose:</p>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`# Clone the repository
git clone https://github.com/your-org/analytics-dashboard-platform.git

# Navigate to the project directory
cd analytics-dashboard-platform

# Start the services
docker-compose up -d

# The platform will be available at http://localhost:3000`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Production Deployment</h3>
                    <p>For production environments, additional configuration is recommended:</p>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`# Clone the repository
git clone https://github.com/your-org/analytics-dashboard-platform.git

# Navigate to the project directory
cd analytics-dashboard-platform

# Copy and edit the environment configuration
cp .env.example .env.production
nano .env.production

# Start the production services
docker-compose -f docker-compose.prod.yml up -d

# The platform will be available at your configured domain`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Kubernetes Deployment</h3>
                    <p>For large-scale deployments, Kubernetes is recommended:</p>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`# Apply the Kubernetes manifests
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/secrets.yaml
kubectl apply -f k8s/configmaps.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/minio.yaml
kubectl apply -f k8s/keycloak.yaml
kubectl apply -f k8s/api.yaml
kubectl apply -f k8s/frontend.yaml
kubectl apply -f k8s/ingress.yaml

# Check the deployment status
kubectl get pods -n analytics-platform`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Cloud Deployment</h3>
                    <p>The platform can be deployed on major cloud providers:</p>

                    <h4 className="font-medium mt-4">AWS Deployment</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Use Amazon ECS or EKS for container orchestration</li>
                      <li>Amazon RDS for PostgreSQL database</li>
                      <li>Amazon S3 instead of MinIO for object storage</li>
                      <li>Amazon Cognito can be integrated as an alternative to Keycloak</li>
                    </ul>

                    <h4 className="font-medium mt-4">Azure Deployment</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Azure Kubernetes Service (AKS) for container orchestration</li>
                      <li>Azure Database for PostgreSQL</li>
                      <li>Azure Blob Storage instead of MinIO</li>
                      <li>Azure Active Directory for authentication</li>
                    </ul>

                    <h4 className="font-medium mt-4">Google Cloud Deployment</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Google Kubernetes Engine (GKE) for container orchestration</li>
                      <li>Cloud SQL for PostgreSQL</li>
                      <li>Google Cloud Storage instead of MinIO</li>
                      <li>Firebase Authentication as an alternative to Keycloak</li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Environment Variables</h3>
                    <p>Key environment variables that need to be configured:</p>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Variable
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Example
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">DATABASE_URL</td>
                            <td className="px-4 py-2 text-sm">PostgreSQL connection string</td>
                            <td className="px-4 py-2 text-sm font-mono">
                              postgresql://user:password@postgres:5432/analytics
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">NEXT_PUBLIC_API_BASE_URL</td>
                            <td className="px-4 py-2 text-sm">Base URL for API requests</td>
                            <td className="px-4 py-2 text-sm font-mono">https://api.example.com</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">NEXT_PUBLIC_KEYCLOAK_URL</td>
                            <td className="px-4 py-2 text-sm">Keycloak server URL</td>
                            <td className="px-4 py-2 text-sm font-mono">https://auth.example.com</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">MINIO_ENDPOINT</td>
                            <td className="px-4 py-2 text-sm">MinIO server endpoint</td>
                            <td className="px-4 py-2 text-sm font-mono">minio:9000</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">MINIO_ACCESS_KEY</td>
                            <td className="px-4 py-2 text-sm">MinIO access key</td>
                            <td className="px-4 py-2 text-sm font-mono">minioadmin</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">MINIO_SECRET_KEY</td>
                            <td className="px-4 py-2 text-sm">MinIO secret key</td>
                            <td className="px-4 py-2 text-sm font-mono">minioadmin</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="authentication" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Authentication & Authorization</CardTitle>
                  <CardDescription>Understanding the security model of the platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Keycloak Integration</h3>
                    <p>
                      The Analytics Dashboard Platform uses Keycloak as its identity and access management solution.
                      Keycloak provides robust authentication, authorization, and user management capabilities.
                    </p>
                  </div>

                  <div className="mt-6 mb-8">
                    <img
                      src="/placeholder.svg?height=300&width=600"
                      alt="Keycloak Authentication Flow"
                      className="rounded-lg border"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Authentication Flow</h3>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>User navigates to the platform and is redirected to the Keycloak login page</li>
                      <li>User enters credentials and Keycloak validates them</li>
                      <li>Upon successful authentication, Keycloak issues JWT tokens (access and refresh)</li>
                      <li>The application stores these tokens and uses them for subsequent API requests</li>
                      <li>When the access token expires, the refresh token is used to obtain a new one</li>
                      <li>If the refresh token expires, the user is prompted to log in again</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">User Roles and Permissions</h3>
                    <p>The platform defines several roles with different permissions:</p>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Role
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Permissions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 text-sm">admin</td>
                            <td className="px-4 py-2 text-sm">System administrator</td>
                            <td className="px-4 py-2 text-sm">
                              Full access to all features, user management, system configuration
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">dev</td>
                            <td className="px-4 py-2 text-sm">Dashboard developer</td>
                            <td className="px-4 py-2 text-sm">
                              Create, edit, and delete dashboards; manage data sources
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">data_steward</td>
                            <td className="px-4 py-2 text-sm">Data governance role</td>
                            <td className="px-4 py-2 text-sm">
                              Approve/reject access requests, manage data classifications
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">engineer</td>
                            <td className="px-4 py-2 text-sm">Data engineer</td>
                            <td className="px-4 py-2 text-sm">
                              Configure data sources, manage data pipelines, approve access
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">analyst</td>
                            <td className="px-4 py-2 text-sm">Data analyst</td>
                            <td className="px-4 py-2 text-sm">
                              View and edit dashboards, create reports, request access
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">viewer</td>
                            <td className="px-4 py-2 text-sm">Basic user</td>
                            <td className="px-4 py-2 text-sm">View authorized dashboards, request access</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Keycloak Configuration</h3>
                    <p>Key steps for configuring Keycloak for the platform:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Create a new realm for the Analytics Dashboard Platform</li>
                      <li>Define the client application with proper redirect URIs</li>
                      <li>Configure the client scopes and mappers</li>
                      <li>Create the required roles (admin, dev, data_steward, etc.)</li>
                      <li>Set up user federation if integrating with existing identity providers</li>
                      <li>Configure authentication flows and policies</li>
                      <li>Set up SMTP for email notifications (password reset, etc.)</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Development Mode</h3>
                    <p>
                      For development and testing purposes, the platform includes a development mode that can bypass
                      authentication:
                    </p>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`# Enable development mode in .env file
NEXT_PUBLIC_DEV_MODE=true
NEXT_PUBLIC_BYPASS_AUTH=true`}
                      </pre>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Note: This should never be enabled in production environments.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="data-storage" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>Data Storage</CardTitle>
                  <CardDescription>Understanding how data is stored and managed</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Database (PostgreSQL)</h3>
                    <p>
                      PostgreSQL is used as the primary relational database for storing structured data. It provides
                      ACID compliance, robust querying capabilities, and excellent performance.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Database Schema</h3>
                    <p>The main tables in the database include:</p>

                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Table
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Description
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Key Fields
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 text-sm">users</td>
                            <td className="px-4 py-2 text-sm">User information synchronized from Keycloak</td>
                            <td className="px-4 py-2 text-sm">id, username, email, roles</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">dashboards</td>
                            <td className="px-4 py-2 text-sm">Dashboard metadata and configuration</td>
                            <td className="px-4 py-2 text-sm">
                              id, name, description, status, classification, created_by
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">dashboard_items</td>
                            <td className="px-4 py-2 text-sm">Individual components within dashboards</td>
                            <td className="px-4 py-2 text-sm">id, dashboard_id, type, position, size, config</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">data_sources</td>
                            <td className="px-4 py-2 text-sm">Data source configurations</td>
                            <td className="px-4 py-2 text-sm">id, name, type, connection_details</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">access_requests</td>
                            <td className="px-4 py-2 text-sm">Dashboard access requests</td>
                            <td className="px-4 py-2 text-sm">
                              id, user_id, dashboard_id, status, reason, reviewed_by
                            </td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm">dashboard_access</td>
                            <td className="px-4 py-2 text-sm">User access permissions for dashboards</td>
                            <td className="px-4 py-2 text-sm">id, user_id, dashboard_id, permission_level</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-6 mb-8">
                    <img
                      src="/placeholder.svg?height=300&width=600"
                      alt="Database Schema Diagram"
                      className="rounded-lg border"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Object Storage (MinIO)</h3>
                    <p>
                      MinIO is used for storing binary and unstructured data. It provides an S3-compatible API, making
                      it easy to integrate with and migrate to cloud storage if needed.
                    </p>

                    <h4 className="font-medium mt-4">Key Buckets</h4>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>
                        <strong>dashboard-thumbnails</strong>: Stores preview images of dashboards for the gallery view
                      </li>
                      <li>
                        <strong>exports</strong>: Stores exported dashboard reports (PDF, Excel, etc.)
                      </li>
                      <li>
                        <strong>uploads</strong>: Stores user-uploaded files for data import
                      </li>
                      <li>
                        <strong>backups</strong>: Stores database backups and configuration snapshots
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Data Backup and Recovery</h3>
                    <p>The platform includes several mechanisms for data protection:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>
                        <strong>Automated backups</strong>: Daily database backups stored in MinIO
                      </li>
                      <li>
                        <strong>Point-in-time recovery</strong>: PostgreSQL WAL archiving for granular recovery
                      </li>
                      <li>
                        <strong>Dashboard versioning</strong>: History of dashboard changes for rollback if needed
                      </li>
                      <li>
                        <strong>Replication</strong>: Optional database and MinIO replication for high availability
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Data Security</h3>
                    <p>Several measures are implemented to ensure data security:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>Encryption at rest for database and object storage</li>
                      <li>TLS encryption for all network communications</li>
                      <li>Role-based access control for data access</li>
                      <li>Data classification to manage sensitive information</li>
                      <li>Audit logging for all data access and modifications</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="user-guide" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>User Guide</CardTitle>
                  <CardDescription>How to use the Analytics Dashboard Platform</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Getting Started</h3>
                    <p>
                      This guide will help you navigate the Analytics Dashboard Platform and make the most of its
                      features.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Logging In</h3>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Navigate to the platform URL provided by your administrator</li>
                      <li>Click the "Login" button in the top right corner</li>
                      <li>Enter your username and password in the Keycloak login screen</li>
                      <li>If you've forgotten your password, use the "Forgot Password" link</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Navigating the Platform</h3>
                    <p>The platform consists of several main sections:</p>
                    <ul className="list-disc pl-6 space-y-1">
                      <li>
                        <strong>Home</strong>: The landing page with quick access to key features
                      </li>
                      <li>
                        <strong>Analytics Hub</strong>: Browse and access available dashboards
                      </li>
                      <li>
                        <strong>Dashboard Creator</strong>: Design and edit dashboards (for authorized users)
                      </li>
                      <li>
                        <strong>Access Requests</strong>: Manage dashboard access permissions
                      </li>
                      <li>
                        <strong>Documentation</strong>: Platform documentation and guides
                      </li>
                    </ul>
                  </div>

                  <div className="mt-6 mb-8">
                    <img
                      src="/placeholder.svg?height=300&width=600"
                      alt="Platform Navigation"
                      className="rounded-lg border"
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Viewing Dashboards</h3>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Navigate to the Analytics Hub</li>
                      <li>Browse available dashboards or use the search and filter options</li>
                      <li>Click on a dashboard card to open it</li>
                      <li>Use the dashboard controls to interact with visualizations</li>
                      <li>Apply filters to refine the data view</li>
                      <li>Export data or visualizations using the export options</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Requesting Access</h3>
                    <p>If you need access to a dashboard that's not currently available to you:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Find the dashboard in the Analytics Hub</li>
                      <li>Click the "Request Access" button on the dashboard card</li>
                      <li>Provide a reason for your access request</li>
                      <li>Submit the request</li>
                      <li>You'll receive a notification when your request is approved or rejected</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Creating Dashboards</h3>
                    <p>For users with dashboard creation permissions:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Click the "Create Dashboard" button in the Analytics Hub</li>
                      <li>Provide a name, description, and other metadata for your dashboard</li>
                      <li>Use the drag-and-drop interface to add visualization components</li>
                      <li>Configure each component with data sources and visualization settings</li>
                      <li>Arrange and resize components as needed</li>
                      <li>Save your dashboard when complete</li>
                      <li>Set access permissions to control who can view your dashboard</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Managing Access Requests</h3>
                    <p>For data stewards, engineers, and administrators:</p>
                    <ol className="list-decimal pl-6 space-y-1">
                      <li>Navigate to the Access Requests section</li>
                      <li>Review pending access requests</li>
                      <li>Approve or reject requests based on your organization's policies</li>
                      <li>Provide a reason for rejections to help users understand the decision</li>
                    </ol>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Keyboard Shortcuts</h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Shortcut
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">Ctrl+K / Cmd+K</td>
                            <td className="px-4 py-2 text-sm">Open command menu</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">Ctrl+S / Cmd+S</td>
                            <td className="px-4 py-2 text-sm">Save dashboard (when editing)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">Ctrl+F / Cmd+F</td>
                            <td className="px-4 py-2 text-sm">Search in current view</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">Esc</td>
                            <td className="px-4 py-2 text-sm">Close dialogs or cancel current action</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">?</td>
                            <td className="px-4 py-2 text-sm">Show keyboard shortcuts help</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api" className="mt-0">
              <Card>
                <CardHeader>
                  <CardTitle>API Reference</CardTitle>
                  <CardDescription>Documentation for the platform's REST API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">API Overview</h3>
                    <p>
                      The Analytics Dashboard Platform provides a comprehensive REST API that allows programmatic access
                      to dashboards, data sources, and other platform features. This API can be used to integrate the
                      platform with other systems or to build custom applications.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Authentication</h3>
                    <p>All API requests require authentication using JWT tokens:</p>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`GET /api/dashboards
Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...`}
                      </pre>
                    </div>
                    <p>
                      To obtain a token, authenticate through Keycloak using the OAuth2 password grant or authorization
                      code flow.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">API Endpoints</h3>
                    <p>The main API endpoints include:</p>

                    <h4 className="font-medium mt-4">Dashboards</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Endpoint
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Method
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/dashboards</td>
                            <td className="px-4 py-2 text-sm">GET</td>
                            <td className="px-4 py-2 text-sm">List all dashboards the user has access to</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/dashboards/{"{id}"}</td>
                            <td className="px-4 py-2 text-sm">GET</td>
                            <td className="px-4 py-2 text-sm">Get a specific dashboard by ID</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/dashboards</td>
                            <td className="px-4 py-2 text-sm">POST</td>
                            <td className="px-4 py-2 text-sm">Create a new dashboard</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/dashboards/{"{id}"}</td>
                            <td className="px-4 py-2 text-sm">PUT</td>
                            <td className="px-4 py-2 text-sm">Update an existing dashboard</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/dashboards/{"{id}"}</td>
                            <td className="px-4 py-2 text-sm">DELETE</td>
                            <td className="px-4 py-2 text-sm">Delete a dashboard</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/dashboards/{"{id}"}/favorite</td>
                            <td className="px-4 py-2 text-sm">POST</td>
                            <td className="px-4 py-2 text-sm">Toggle favorite status for a dashboard</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h4 className="font-medium mt-4">Access Requests</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Endpoint
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Method
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/access-requests</td>
                            <td className="px-4 py-2 text-sm">GET</td>
                            <td className="px-4 py-2 text-sm">List access requests (filtered by user role)</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/access-requests</td>
                            <td className="px-4 py-2 text-sm">POST</td>
                            <td className="px-4 py-2 text-sm">Create a new access request</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/access-requests/{"{id}"}</td>
                            <td className="px-4 py-2 text-sm">GET</td>
                            <td className="px-4 py-2 text-sm">Get a specific access request</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/access-requests/{"{id}"}/approve</td>
                            <td className="px-4 py-2 text-sm">POST</td>
                            <td className="px-4 py-2 text-sm">Approve an access request</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/access-requests/{"{id}"}/reject</td>
                            <td className="px-4 py-2 text-sm">POST</td>
                            <td className="px-4 py-2 text-sm">Reject an access request</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <h4 className="font-medium mt-4">Data Sources</h4>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-border">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Endpoint
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Method
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                              Description
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/data-sources</td>
                            <td className="px-4 py-2 text-sm">GET</td>
                            <td className="px-4 py-2 text-sm">List available data sources</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/data-sources/{"{id}"}</td>
                            <td className="px-4 py-2 text-sm">GET</td>
                            <td className="px-4 py-2 text-sm">Get a specific data source</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/data-sources</td>
                            <td className="px-4 py-2 text-sm">POST</td>
                            <td className="px-4 py-2 text-sm">Create a new data source</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/data-sources/{"{id}"}</td>
                            <td className="px-4 py-2 text-sm">PUT</td>
                            <td className="px-4 py-2 text-sm">Update a data source</td>
                          </tr>
                          <tr>
                            <td className="px-4 py-2 text-sm font-mono">/api/data-sources/{"{id}"}/test</td>
                            <td className="px-4 py-2 text-sm">POST</td>
                            <td className="px-4 py-2 text-sm">Test a data source connection</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Example API Requests</h3>
                    <p>Here are some example API requests using curl:</p>

                    <h4 className="font-medium mt-4">List Dashboards</h4>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`curl -X GET \\
  "https://api.example.com/api/dashboards?page=1&limit=10" \\
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -H "Content-Type: application/json"`}
                      </pre>
                    </div>

                    <h4 className="font-medium mt-4">Create a Dashboard</h4>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`curl -X POST \\
  "https://api.example.com/api/dashboards" \\
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Sales Overview",
    "description": "Dashboard showing sales performance metrics",
    "status": "draft",
    "classification": "internal",
    "tags": ["sales", "performance", "metrics"]
  }'`}
                      </pre>
                    </div>

                    <h4 className="font-medium mt-4">Request Access</h4>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`curl -X POST \\
  "https://api.example.com/api/access-requests" \\
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "dashboardId": "123e4567-e89b-12d3-a456-426614174000",
    "reason": "Need access to monitor sales performance in my region"
  }'`}
                      </pre>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-lg font-medium">Error Handling</h3>
                    <p>The API uses standard HTTP status codes and returns error details in the response body:</p>
                    <div className="bg-muted p-4 rounded-md font-mono text-sm overflow-x-auto">
                      <pre>
                        {`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "You do not have permission to access this resource",
    "details": "Required role: admin"
  }
}`}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
