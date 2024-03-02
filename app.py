from flask import Flask, jsonify, render_template
import pandas as pd
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
import numpy as np

app = Flask(__name__)

# Load and preprocess your CSV data
df = pd.read_csv('Updated_Selected_Loan_Data.csv').select_dtypes(include=[np.number]).dropna()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/pca')
def pca_data():
    print("PCA called")
    # Standardize the data
    scaler = StandardScaler()
    X_std = scaler.fit_transform(df)

    # Compute PCA
    pca = PCA()
    pca.fit(X_std)

    # Eigenvalues and explained variance
    eigenvalues = pca.explained_variance_.tolist()
    explained_variance_ratio = pca.explained_variance_ratio_.tolist()

    # PCA components for the biplot (scores and loadings)
    scores = pca.transform(X_std).tolist()
    loadings = pca.components_.tolist()

    return jsonify({
        'eigenvalues': eigenvalues,
        'explained_variance_ratio': explained_variance_ratio,
        'scores': scores,
        'loadings': loadings
    })

if __name__ == '__main__':
    app.run(debug=True)
