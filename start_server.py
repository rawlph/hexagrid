#!/usr/bin/env python3
"""
Simple HTTP Server for testing the Hexgrid Evolution game
"""
import os
import sys
import webbrowser
from http.server import HTTPServer, SimpleHTTPRequestHandler

class NoCacheHTTPRequestHandler(SimpleHTTPRequestHandler):
    """Handler that prevents caching of resources"""
    def end_headers(self):
        """Add no-cache headers before sending headers"""
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

def start_server(port=8000):
    """Start the HTTP server on the specified port"""
    # Ensure we're in the correct directory (where index.html is located)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    # Check if index.html exists in the current directory
    if not os.path.exists('index.html'):
        print("Error: index.html not found in the current directory!")
        print(f"Current directory: {os.getcwd()}")
        print("Please run this script from the directory containing index.html")
        sys.exit(1)
    
    server_address = ('', port)
    httpd = HTTPServer(server_address, NoCacheHTTPRequestHandler)
    
    print(f"Starting server on port {port}...")
    print(f"Serving from directory: {os.getcwd()}")
    print(f"Open your browser and navigate to: http://localhost:{port}")
    print("Press Ctrl+C to stop the server")
    
    try:
        # Open the browser automatically
        webbrowser.open(f'http://localhost:{port}')
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        httpd.server_close()
        sys.exit(0)

if __name__ == "__main__":
    # Get port from command line arguments if provided
    port = 8000
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print(f"Invalid port number: {sys.argv[1]}")
            sys.exit(1)
    
    start_server(port) 