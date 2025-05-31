function InventoryFilters() {
  return (
    <div className="bg-base-100 p-4 rounded-lg shadow mb-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="form-control">
          <input
            type="text"
            placeholder="Search products..."
            className="input input-bordered"
          />
        </div>

        <div className="form-control">
          <select className="select select-bordered w-full">
            <option value="">All Categories</option>
            <option>Electronics</option>
            <option>Accessories</option>
            <option>Storage</option>
          </select>
        </div>

        <div className="form-control">
          <select className="select select-bordered w-full">
            <option value="">Stock Status</option>
            <option>In Stock</option>
            <option>Low Stock</option>
            <option>Out of Stock</option>
          </select>
        </div>

        <div className="form-control">
          <select className="select select-bordered w-full">
            <option value="">Sort By</option>
            <option>Name: A-Z</option>
            <option>Name: Z-A</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Stock: Low to High</option>
            <option>Stock: High to Low</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default InventoryFilters;
