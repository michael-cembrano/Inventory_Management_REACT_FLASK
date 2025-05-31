import { useState, useEffect } from "react";
import LoadingScreen from "../components/LoadingScreen";

function Products() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) return <LoadingScreen />;

  return (
    <div className="p-4">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0">Product Management</h2>
        <button className="btn btn-primary">Add New Product</button>
      </div>

      <div className="bg-base-100 p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search products..."
            className="input input-bordered"
          />
          <select className="select select-bordered">
            <option value="">All Categories</option>
            <option>Electronics</option>
            <option>Accessories</option>
          </select>
          <select className="select select-bordered">
            <option value="">Sort By</option>
            <option>Name: A-Z</option>
            <option>Price: Low to High</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card bg-base-100 shadow-xl">
            <figure className="px-4 pt-4">
              <img
                src={`https://picsum.photos/300/200?random=${i}`}
                className="rounded-xl"
                alt="Product"
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title">Product Name</h2>
              <p>Product description goes here...</p>
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">$299.99</span>
                <div className="card-actions">
                  <button className="btn btn-sm">Edit</button>
                  <button className="btn btn-sm btn-error">Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Products;
