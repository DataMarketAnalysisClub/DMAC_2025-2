from flask import Flask
from flask_cors import CORS
from api.routes import api_bp

def create_app():
    app = Flask(__name__)
    # Enable CORS to allow requests from your React app (usually on port 3000)
    CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})
    
    # Register Blueprints
    app.register_blueprint(api_bp, url_prefix='/api')
    
    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
