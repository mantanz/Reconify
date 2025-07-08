const AddPanel = () => {
  return (
    <div className="bg-white p-8 rounded-lg shadow max-w-xl mx-auto mt-10">
      <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">Add Panel</h2>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Panel Name:</label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter panel name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Upload Panel File:</label>
          <input
            type="file"
            className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0 file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SOT for Mapping</label>
          <select className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option>-- Select --</option>
            <option>SOT 1</option>
            <option>SOT 2</option>
            <option>SOT 3</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Key Mapping</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Panel</label>
              <select className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>emp_id</option>
                <option>email</option>
                <option>role</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">SOT</label>
              <select className="border border-gray-300 rounded-md px-3 py-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>employee_id</option>
                <option>user_email</option>
                <option>designation</option>
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

export default AddPanel; 