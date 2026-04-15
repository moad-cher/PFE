import { Link } from 'react-router-dom';

export default function ApplySuccess() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow p-12 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h1>
        <p className="text-gray-500 mb-6">
          Thank you for applying. Our team will review your application and get back to you soon.
        </p>
        <p className="text-sm text-gray-400 mb-8">You will receive a response by email.</p>
        <Link to="/hiring/jobs" className="px-6 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700">
          See More Jobs
        </Link>
      </div>
    </div>
  );
}
