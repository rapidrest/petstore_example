# Petstore

An example RapidREST server based upon OpenAPI's petstore example specification.

The project implements the following RapidREST features:

* JWT authentication
* MongoDB database support
* CRUDS operations
 * Count
 * Create
 * Delete
 * Find All
 * Find by ID
 * Truncate
 * Update
 * Update Property
* 2nd Level Caching
* Automatic OpenAPI Documentation

## Getting Started

To get started using this service first clone the source. It is highly recommended that you fork the project first.

```bash
git clone https://github.com/rapidrest/petstore_example.git
```

## Deployment

This project provides scripts for running in Docker or Kubernetes. For Docker, you will find *docker-compose* scripts
in the project source. For Kubernetes, a *helm* chart is available both in the project source and via GitHub Container
Registry (ghcr.io).

### Kubernetes

A complete Helm chart is included for convenience to deploy and run on a Kubernetes cluster. Deployment to Kubernetes
is easy using either the published helm chart in GitHub or install from the helm chart locally.

#### From GHCR

```bash
helm repo add rapidrest oci://ghcr.io/rapidrest/charts
helm install --create-namespace --namespace petstore petstore @rapidrest/petstore
```

#### From Local

```bash
helm repo add bitnami https://charts.bitnami.com/bitnami
helm dep up ./helm
helm install --create-namespace --namespace petstore petstore ./helm
```

### Docker

To run this project on docker you must use the included *docker-compose* scripts in the project source. Open up a new
shell to the cloned folder and build the Docker image using `docker-compose`.

```bash
docker-compose build
```

You can now run the server with the following command.

```bash
docker-compose up
```

## Debugging

[Visual Studio Code](https://code.visualstudio.com/) is the recommended IDE to develop with. The project includes workspace and launch configuration files out of the box.

To debug while running via Docker Compose select the `Docker: Attach Debugger` configuration and hit the `F5` key. If you want to run the server directly and debug choose the `Launch Server` configuration.