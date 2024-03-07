from flask import Flask, jsonify, render_template
import pandas as pd
import os
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from scipy.signal import find_peaks
import numpy as np

app = Flask(__name__)

df = pd.read_csv("Updated_Selected_Loan_Data.csv").select_dtypes(include=[np.number]).dropna()

pca = PCA()


@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/pca')
def pca_data():
    # Standardize the data
    scaler = StandardScaler()
    X_std = scaler.fit_transform(df)
    
    X = df.select_dtypes(include=[np.number])
    feature_names = X.columns.tolist()

    # Compute PCA
    pca.fit(X_std)

    # Eigenvalues and explained variance
    eigenvalues = pca.explained_variance_.tolist()
    explained_variance_ratio = pca.explained_variance_ratio_.tolist()
    cumulative_explained_variance = np.cumsum(explained_variance_ratio).tolist()

    # Find the elbow point: where cumulative explained variance exceeds a threshold (e.g., 90%)
    threshold = 0.9  # Threshold for cumulative explained variance
    elbow_point = next(i for i, total_variance in enumerate(cumulative_explained_variance) if total_variance >= threshold) + 1

    # PCA components for the biplot (scores and loadings)
    scores = pca.transform(X_std).tolist()
    loadings = pca.components_.tolist()
    
    kmeans_results = {}
    inertias = []
    for k in range(1, 11):
        kmeans = KMeans(n_clusters=k, random_state=42).fit(X_std)
        inertias.append(kmeans.inertia_)
        kmeans_results[k] = {
            'inertia': kmeans.inertia_,
            'labels': kmeans.labels_.tolist()
        }
        
    # Calculate the second derivative
    second_derivative = np.diff(inertias, n=2)

    # Find peaks in the second derivative
    peaks, _ = find_peaks(second_derivative)

    # The elbow point is likely to be at the first peak
    if peaks.size > 0:
        elbow_point_k = peaks[0] + 1  # plus one due to the zero-indexing
    else:
        elbow_point_k = 1  # default to 1 if no peaks are found

    initial_k = int(elbow_point_k)
    
    # initial_k = 4
    
    # Convert kmeans_results to ensure all values are JSON serializable
    kmeans_results_json = {}
    for k, result in kmeans_results.items():
        kmeans_results_json[k] = {
            'inertia': result['inertia'],
            'labels': result['labels']
        }

    return jsonify({
        'eigenvalues': eigenvalues,
        'explained_variance_ratio': explained_variance_ratio,
        'elbow_point': elbow_point,
        'scores': scores,
        'loadings': loadings,
        'kmeans_results': kmeans_results_json,
        'initial_k': initial_k,
        'attributeNames': feature_names 
    })
    
@app.route('/api/pca/loadings')
def pca_loadings():
    scaler = StandardScaler()
    X_std = scaler.fit_transform(df)
    
    X = df.select_dtypes(include=[np.number])
    feature_names = X.columns.tolist()
    
    if not hasattr(pca, 'components_'):
        pca.fit(X_std)
    
    loadings = pca.components_.T.tolist()  # Transpose to get attribute loadings
    scores = pca.transform(X_std).tolist()  # Get the transformed scores
    
    return jsonify({
        'loadings': loadings, 
        'scores':scores,
        'attributeNames':feature_names
    })
    
@app.route('/api/kmeans')
def kmeans_clusters():
    scaler = StandardScaler()
    X_std = scaler.fit_transform(df)

    kmeans_results = {}
    for k in range(1, 11):
        kmeans = KMeans(n_clusters=k, random_state=42).fit(X_std)
        kmeans_results[k] = {
            'inertia': kmeans.inertia_,  # Sum of squared distances of samples to their closest cluster center
            'labels': kmeans.labels_.tolist()
        }
    
    # Find the elbow point and set the initial k
    # You might need a more sophisticated method to find the elbow
    initial_k = 3  # Placeholder for elbow point

    return jsonify({'kmeans_results': kmeans_results, 'initial_k': initial_k})

if __name__ == '__main__':
    app.run(debug=True)
