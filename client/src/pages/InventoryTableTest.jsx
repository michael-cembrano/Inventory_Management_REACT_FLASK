import React from 'react';
import InventoryTable from '../components/InventoryTable';

function InventoryTableTest() {
  const handleEdit = (item) => {
    console.log("TEST: Edit function called with item:", item);
    alert(`Edit button works! Item: ${item.name}`);
  };

  const handleRefresh = () => {
    console.log("TEST: Refresh function called");
    alert("Refresh button works!");
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Inventory Table Test</h1>
      <div className="alert alert-info mb-4">
        <span>This page tests the InventoryTable component with proper props</span>
      </div>
      
      <InventoryTable 
        onEdit={handleEdit}
        onRefresh={handleRefresh}
      />
    </div>
  );
}

export default InventoryTableTest;