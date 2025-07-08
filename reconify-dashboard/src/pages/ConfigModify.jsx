const ConfigModify = () => {
  // These will be fetched from the backend in the future
  const panels = ['Seller Panel', 'Buyer Panel', 'HR Panel'];
  const sots = ['SOT1', 'SOT2', 'SOT3'];
  // Placeholder for mapping data (to be fetched from API)
  const mappings = [];

  return (
    <div className="bg-white p-8 rounded-lg shadow max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Modify Panel</h2>

      <div className="space-y-5">
        {/* Select Panel */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Panel:</label>
          <select className="w-full border border-blue-400 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {panels.map((panel) => (
              <option key={panel}>{panel}</option>
            ))}
          </select>
        </div>

        {/* Existing Mapping(s) - to be fetched from backend */}
        <div>
          <div className="block text-sm font-medium text-gray-700 mb-1">Existing Mapping(s):</div>
          <ul className="ml-4 text-base text-gray-500 italic">
            <li>No mapping data (to be loaded from backend)</li>
          </ul>
        </div>

        {/* File input */}
        <div>
          <input
            type="file"
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0 file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        {/* Select SOT for Mapping */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SOT for Mapping</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            {sots.map((sot) => (
              <option key={sot}>{sot}</option>
            ))}
          </select>
        </div>

        {/* Key Mapping for HR Data */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Key Mapping</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Panel</label>
              <select className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>user_email</option>
                <option>cust_id</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SOT</label>
              <select className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>email</option>
                <option>user_id</option>
              </select>
            </div>
          </div>
        </div>

        <div className="pt-4">
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-md shadow">
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfigModify; 