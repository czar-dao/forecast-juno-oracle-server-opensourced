# oracle-server

This is an oracle websocket server to be hosted on Akash cloud computing.

## Getting Started

First, install the packages and run the oracle server:

```bash
yarn install
node app.ts
```

The node server will be running on port 443.

It can be tested using WebSocket Test Client chrome extension:

Open a connection to [ws://localhost:443](ws://localhost:443) with your browser extension to see the result.

## Build Instructions

If on M1 / ARM architecture

```bash
export DOCKER_DEFAULT_PLATFORM=linux/amd64
```

Build and push image

```bash
docker build -t <User>/<ServerName>:<new tag> .
docker push <User>/<ServerName>:<new tag>
```

Then update the Akash Manifest to realize changes
