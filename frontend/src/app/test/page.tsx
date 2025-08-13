import Link from 'next/link';

export default function TestPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Page</h1>
      <p>If you can see this, basic Next.js routing is working!</p>
      <div className="mt-4">
        <Link href="/" className="text-blue-600 hover:underline">Go back to home</Link>
      </div>
    </div>
  );
}
