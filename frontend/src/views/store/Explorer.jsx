import React from 'react';
import { Link } from 'react-router-dom';

function Explorer({ products }) {
  return (
    <div className="explorer">
      <h2>Résultats de la recherche</h2>
      {products?.length > 0 ? (
        products.map((product) => (
          <div key={product.id} className="product-item">
            <Link to={`/product/${product.slug}`}>
              <img src={product.image} alt={product.title} style={{ width: '100px', height: '100px' }} />
              <h3>{product.title}</h3>
            </Link>
            <p>{product.description}</p>
            <p>Prix: {product.price} FCFA</p>
          </div>
        ))
      ) : (
        <p>Aucun produit trouvé.</p>
      )}
    </div>
  );
}

export default Explorer;
