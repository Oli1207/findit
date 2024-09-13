import React, { useState } from 'react';
import apiInstance from '../../utils/axios';

function ImageSearch() {
  const [image, setImage] = useState(null);
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');

  const handleImageChange = (e) => {
    setImage(e.target.files[0]);
  };

  const handleSearch = async () => {
    if (!image) return;

    const formData = new FormData();
    formData.append('image', image);

    try {
      const response = await apiInstance.post('image-search/', formData);
      if (response.data.length === 0) {
        setMessage('Pas de correspondance trouvée');
      } else {
        setResults(response.data);
        setMessage(''); // Réinitialise le message en cas de résultats
      }
    } catch (error) {
      console.error('Error searching image:', error);
    }
  };

  return (
    <div className="image-search-container">
      <input type="file" accept="image/*" onChange={handleImageChange} />
      <button onClick={handleSearch}>Search</button>

      {message && <p>{message}</p>}

      <div className="search-results">
        {results.map((product) => (
          <div key={product.id} className="product-card">
            <img src={product.image} alt={product.name} />
            <h5>{product.name}</h5>
            <p>{product.price}frs</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageSearch;
