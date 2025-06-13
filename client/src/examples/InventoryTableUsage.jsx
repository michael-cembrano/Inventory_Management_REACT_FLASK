    // Example of how to properly use InventoryTable in any parent component

import { useState } from 'react';
import InventoryTable from '../components/InventoryTable';

function ParentComponent() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Handle edit button click
  const handleEdit = (item) => {
    console.log("Parent: Edit requested for item:", item);
    setEditingItem(item);
    setIsEditModalOpen(true);
    // Add your edit modal logic here
  };

  // Handle refresh after operations
  const handleRefresh = () => {
    console.log("Parent: Refresh requested");
    // Add your refresh logic here (fetch data, update state, etc.)
  };

  return (
    <div>
      {/* Your other content */}
      
      {/* Correctly use InventoryTable with props */}
      <InventoryTable 
        onEdit={handleEdit}      // Required: Function to handle edit
        onRefresh={handleRefresh} // Required: Function to handle refresh
      />
      
      {/* Your edit modal or other components */}
    </div>
  );
}

export default ParentComponent;