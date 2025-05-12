export default function ComplianceStatusCard() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
      <h2 className="text-lg font-medium mb-4">Compliance Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <span className="material-icons text-success mr-2">check_circle</span>
            <h3 className="font-medium">PDF/A-3 Compliance</h3>
          </div>
          <p className="text-sm text-gray-600">All your invoices meet PDF/A-3 standards with proper font embedding and color profiles.</p>
        </div>
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <span className="material-icons text-warning mr-2">warning</span>
            <h3 className="font-medium">XML Semantic Validation</h3>
          </div>
          <p className="text-sm text-gray-600">2 invoices have semantic validation issues. Missing required fields in BASIC WL profile.</p>
        </div>
        <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center mb-2">
            <span className="material-icons text-success mr-2">check_circle</span>
            <h3 className="font-medium">Metadata Structure</h3>
          </div>
          <p className="text-sm text-gray-600">All XMP metadata is properly structured and includes required fields for Factur-X.</p>
        </div>
      </div>
    </div>
  );
}
