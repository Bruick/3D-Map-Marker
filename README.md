# 3D Model on Google Maps with WebGL

## Disclaimer
This project was made for Mcity and only Mcity affiliates will have an Atrium key.

## Instructions

### Step 1: Install Packages
Run the following command to install the required Node.js packages:
```sh
npm install
```

### Step 2: Create a `.env` File
Create a `.env` file in the root of your project directory with the following content:
```plaintext
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
SOCKET_IO_API_KEY=your-socket-io-api-key
MAP_ID=your-map-id
```
Replace the placeholder values with your actual API keys.

### Step 3: Run the Application
Use the command below to start the development server:
```sh
sudo npm run dev --host
```

## Code Explanation

### Imports and Initial Setup
The code begins by importing necessary libraries and modules for 3D rendering, model loading, WebSocket communication, and environment variable configuration.

- **Three.js Components**: These components (`AmbientLight`, `DirectionalLight`, `Matrix4`, `PerspectiveCamera`, `Scene`, `WebGLRenderer`, `Color`, `Vector3`, and `Quaternion`) are used to create and manage the 3D scene, including lights, camera, and rendering.
- **GLTFLoader**: A module from Three.js used for loading 3D models in the GLTF format.
- **socket.io-client**: For real-time bidirectional event-based communication.
- **dotenv**: To load environment variables from a `.env` file into `process.env`.

Variables for the map (`map`), 3D model (`model`), and a transformer (`transformer`) are declared. These will be used to handle the map instance, the 3D model instance, and coordinate transformations.

The `mapOptions` object is defined to configure the appearance and behavior of the Google Map. It includes settings for tilt, heading, zoom level, center coordinates, map ID (retrieved from environment variables), and various UI and interaction options.

### Initializing the Map
The `initMap` function initializes the Google Map by retrieving the HTML element where the map will be displayed and creating the map with specified options. This includes the map's center, zoom, tilt, and other configurations. The function then calls `initWebglOverlayView(map)`, `initControls()`, and `initWebSocket()` to initialize the WebGL overlay, map controls, and WebSocket connection, respectively.

### WebGL Overlay View
The `initWebglOverlayView` function sets up the WebGL overlay on the map using Three.js. This overlay allows rendering 3D content on top of the Google Map.

- **onAdd**: Sets up the Three.js scene, camera, ambient light, and directional light. The GLTFLoader loads a 3D model of a car, which is scaled, rotated to face north, and positioned at ground level. The model's color is changed to red.
- **onContextRestored**: Configures the WebGLRenderer with the WebGL canvas and context, ensuring the renderer does not automatically clear, which allows the Google Map to remain visible beneath the 3D content.
- **onDraw**: Retrieves the transformation matrix from the map's transformer and applies it to the camera's projection matrix. The scene is rendered using the WebGLRenderer, and the transformer is saved for use in updating the model's position.

The `webglOverlayView` is set on the map using `webglOverlayView.setMap(map)`.

### Map Controls
The `initControls` function sets up event listeners for buttons that control the map's tilt and heading. Each button updates the corresponding map property using methods like `map.setTilt()` and `map.setHeading()`, allowing users to interactively adjust the map's view.

### WebSocket Connection
The `initWebSocket` function establishes a WebSocket connection to a server (Atrium) using socket.io-client. The connection is authenticated using an API key from environment variables and performs the following steps:

- **Connection Setup**: Connects to the WebSocket server with the specified authentication token and transport options.
- **Join Room**: Joins a room named 'behaviorstate' to receive beacon data.
- **Message Handling**: Listens for messages in the joined room. When a message is received, it is parsed and checked for a specific beacon ID (`543DF7`). If the message contains data for this beacon ID, the `updateMarkerPosition` function is called to update the model's position.

### Updating the Model Position
The `updateMarkerPosition` function updates the 3D model's position and rotation based on received data. The function performs the following steps:

- **Extract Data**: Retrieves latitude (`Lat`), longitude (`Long`), and heading (`Heading`) from the received data.
- **Calculate Position**: Calculates the differences in latitude and longitude between the current map center and the received coordinates in radians. These differences are then converted to meters using the Earth's radius. The calculations are as follows:
  - `dLat = (parseFloat(Lat) - currentLat) * (Math.PI / 180)`: Converts the difference in latitude to radians.
  - `dLng = (parseFloat(Long) - currentLng) * (Math.PI / 180)`: Converts the difference in longitude to radians.
  - `x = dLng * R * Math.cos(currentLat * (Math.PI / 180))`: Converts the longitude difference to meters, adjusting for the Earth's curvature by multiplying by the cosine of the current latitude.
  - `y = dLat * R`: Converts the latitude difference to meters.

- **Update Model**: Sets the model's position using the calculated x and y coordinates and adjusts its rotation based on the heading value. The heading is converted from degrees to radians and applied to the model's rotation to ensure the model's orientation matches the received heading value. The formula used is:
  - `headingRadians = (Math.PI / 180) * headingValue`: Converts the heading from degrees to radians.
  - `model.rotation.z = Math.PI - headingRadians`: Adjusts the model's rotation in the Three.js scene.


### Adding the Google Maps Script
The script dynamically creates a script element to load the Google Maps API. The API key is retrieved from environment variables, and the `callback` parameter is set to `initMap`. This ensures the map is set up and displayed when the API script is loaded.
