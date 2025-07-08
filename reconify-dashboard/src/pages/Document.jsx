import { useParams, Link } from 'react-router-dom';

export default function Document() {
  const { id } = useParams();
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-4">Document: {id}</h2>
      <p className="mb-6">(Placeholder) Here you can render or download the original file or show details for <strong>{id}</strong>.</p>
      <Link to="/reconciliation" className="text-primary underline">← Back to reconciliation</Link>
    </div>
  );
} 