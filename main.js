// Run with: sudo npm run dev --host
// Commented by ChatGPT 4o

// Load environment variables from .env file
import dotenv from 'dotenv';
dotenv.config();

import {
  AmbientLight,
  DirectionalLight,
  Matrix4,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  Color,
  Vector3,
  Quaternion
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import io from "socket.io-client";
import $ from "jquery";
import pako from "pako";

// Declare variables for map, model, and transformer
let map, model, transformer;

// Define map options
const mapOptions = {
  tilt: 45, // Enable 3D tilt
  heading: 0,
  zoom: 17,
  center: { lat: 42.3012213, lng: -83.6967968 },
  mapId: process.env.MAP_ID, // Use environment variable for map ID
  disableDefaultUI: false,
  gestureHandling: "auto",
  keyboardShortcuts: true,
  mapTypeId: 'satellite'
};

// Define API key for WebSocket authentication using environment variable
const apiKey = process.env.SOCKET_IO_API_KEY;

// Function to initialize the map
function initMap() {
  const mapDiv = document.getElementById("map"); // Get the map container element

  map = new google.maps.Map(mapDiv, mapOptions); // Create the map with the specified options
  initWebglOverlayView(map); // Initialize WebGL overlay view
  initControls(); // Initialize map controls
  initWebSocket(); // Initialize WebSocket connection
}

// Function to initialize the WebGL overlay view
function initWebglOverlayView(map) {
  let scene, renderer, camera, loader;
  const webglOverlayView = new google.maps.WebGLOverlayView();

  webglOverlayView.onAdd = () => {
    scene = new Scene(); // Create a Three.js scene
    camera = new PerspectiveCamera(); // Create a camera

    const ambientLight = new AmbientLight(0xffffff, 0.75); // Add ambient light
    scene.add(ambientLight);

    const directionalLight = new DirectionalLight(0xffffff, 0.25); // Add directional light
    directionalLight.position.set(0.5, -1, 0.5);
    scene.add(directionalLight);

    loader = new GLTFLoader();
    const source = "car.gltf"; // Path to the 3D model

    loader.load(source, (gltf) => {
      model = gltf.scene; // Load the 3D model
      model.scale.set(0.01, 0.01, 0.01); // Scale the model
      model.rotation.x = 0; // Adjust rotation to lay the car flat
      model.rotation.z = Math.PI; // Initial rotation set to North
      model.position.y = 0; // Ensure the car is at ground level

      // Change the color of the model to red
      model.traverse((child) => {
        if (child.isMesh) {
          child.material.color = new Color(0xFF0000); // Red color
        }
      });

      scene.add(model); // Add the model to the scene
    });
  };

  webglOverlayView.onContextRestored = ({ gl }) => {
    renderer = new WebGLRenderer({
      canvas: gl.canvas,
      context: gl,
      ...gl.getContextAttributes(),
    });
    renderer.autoClear = false;

    loader.manager.onLoad = () => {
      webglOverlayView.requestRedraw(); // Request redraw when the model is loaded
    };
  };

  webglOverlayView.onDraw = ({ gl, transformer: t }) => {
    transformer = t; // Save transformer for use in updateMarkerPosition

    const latLngAltitudeLiteral = {
      lat: mapOptions.center.lat,
      lng: mapOptions.center.lng,
      altitude: 0,
    };

    const matrix = transformer.fromLatLngAltitude(latLngAltitudeLiteral); // Get transformation matrix
    camera.projectionMatrix = new Matrix4().fromArray(matrix); // Set camera projection matrix

    webglOverlayView.requestRedraw(); // Request redraw
    renderer.render(scene, camera); // Render the scene
    renderer.resetState(); // Reset renderer state
  };

  webglOverlayView.setMap(map); // Set the WebGL overlay on the map
}

// Function to initialize map controls
function initControls() {
  document.getElementById('top').addEventListener('click', () => {
    map.setTilt(0); // Set tilt to 0 degrees
  });

  document.getElementById('tilt25').addEventListener('click', () => {
    map.setTilt(25); // Set tilt to 25 degrees
  });

  document.getElementById('tilt45').addEventListener('click', () => {
    map.setTilt(45); // Set tilt to 45 degrees
  });

  document.getElementById('tilt75').addEventListener('click', () => {
    map.setTilt(75); // Set tilt to 75 degrees
  });

  document.getElementById('horizon').addEventListener('click', () => {
    map.setTilt(90); // Set tilt to 90 degrees (horizon view)
  });

  document.getElementById('north').addEventListener('click', () => {
    map.setHeading(0); // Set heading to North
  });

  document.getElementById('east').addEventListener('click', () => {
    map.setHeading(90); // Set heading to East
  });

  document.getElementById('south').addEventListener('click', () => {
    map.setHeading(180); // Set heading to South
  });

  document.getElementById('west').addEventListener('click', () => {
    map.setHeading(270); // Set heading to West
  });
}

// Function to initialize WebSocket connection
function initWebSocket() {
  const socket = io.connect("https://atrium.um.city/ros-topics", {
    auth: {
      token: apiKey // Authenticate using API key from environment variable
    },
    transports: ['websocket']
  });

  socket.on('connect', () => {
    console.log('Connected to WebSocket server');
    const roomName = 'behaviorstate';
    socket.emit('join', roomName); // Join the room for receiving data

    socket.on(roomName, (msg) => {
      console.log(msg.message);
      let message;
      try {
        if (typeof msg.message === "string") {
          message = JSON.parse(msg.message); // Parse message if it's a string
        } else {
          message = msg.message; // Use message directly if it's an object
        }
        if (message.id === "543DF7") { // Check for specific beacon ID
          updateMarkerPosition(message); // Update marker position
        }
      } catch (error) {
        console.error("Error parsing message:", error);
      }
    });
  });

  socket.on("connect_error", (err) => {
    console.log(`Connect error: ${err.message}`);
  });
}

// Function to update the marker position
function updateMarkerPosition(data) {
  const { Lat, Long, Heading } = data;

  // Use Heading value if it exists, otherwise default to 0
  const headingValue = Heading ? parseFloat(Heading) : 0;

  // Log the latitude, longitude, and heading for debugging
  console.log(`Latitude: ${Lat}, Longitude: ${Long}, Heading: ${headingValue}`);

  if (model) {
    // Radius of the Earth in meters
    const R = 6378137;

    // Current latitude and longitude of the model
    const currentLat = mapOptions.center.lat;
    const currentLng = mapOptions.center.lng;

    // Calculate differences in latitude and longitude
    const dLat = (parseFloat(Lat) - currentLat) * (Math.PI / 180);
    const dLng = (parseFloat(Long) - currentLng) * (Math.PI / 180);

    // Convert latitude and longitude differences to meters
    const x = dLng * R * Math.cos(currentLat * (Math.PI / 180));
    const y = dLat * R;

    // Log the converted coordinates for debugging
    console.log(`Converted coordinates: x = ${x}, y = ${y}`);

    // Update the model position
    model.position.set(x, y, 0);

    // Convert heading from degrees to radians and adjust for Three.js
    const headingRadians = (Math.PI / 180) * headingValue;
    model.rotation.z = Math.PI - headingRadians; // Apply heading

    // Log the updated position and rotation for debugging
    console.log(`Updated Position: x = ${x}, y = ${y}, z = 0`);
    console.log(`Updated Heading: ${headingValue} degrees, ${headingRadians} radians`);
  } else {
    console.error("Model is not initialized");
  }
}

// Initialize the map when the Google Maps script is loaded
window.initMap = initMap;

// Dynamically add the Google Maps script
const script = document.createElement('script');
script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.GOOGLE_MAPS_API_KEY}&callback=initMap&v=weekly`;
script.defer = true;
document.head.appendChild(script);
