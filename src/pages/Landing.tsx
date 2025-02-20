import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="bg-white text-gray-900 font-sans">
      {/* Hero Section */}
      <section className="h-screen flex flex-col justify-center items-center text-center p-6">
        <h1 className="text-6xl font-bold max-w-4xl">Maximize Your Business Profits with AI</h1>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl">
          ClearProfit AI helps you identify hidden revenue opportunities and reduce unnecessary costs effortlessly.
        </p>
        <div className="mt-6 space-x-4">
          <Link to="/signup" className="bg-black text-white px-6 py-3 rounded-lg text-lg">Try for Free</Link>
          <Link to="/features" className="border border-black text-black px-6 py-3 rounded-lg text-lg">See How It Works</Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-gray-100 text-center">
        <h2 className="text-5xl font-bold">How ClearProfit AI Works</h2>
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-12 max-w-6xl mx-auto px-6">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold">Automated Expense Audits</h3>
            <p className="text-gray-600 mt-3">AI-driven analysis to detect inefficiencies in your spending.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold">Revenue Optimization</h3>
            <p className="text-gray-600 mt-3">Discover new revenue streams and improve profit margins.</p>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <h3 className="text-2xl font-semibold">Actionable Insights</h3>
            <p className="text-gray-600 mt-3">Receive data-backed recommendations to enhance profitability.</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 text-center">
        <h2 className="text-5xl font-bold">Boost Your Profits Today</h2>
        <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
          Join businesses using ClearProfit AI to unlock their full revenue potential.
        </p>
        <div className="mt-6">
          <Link to="/signup" className="bg-black text-white px-8 py-4 rounded-lg text-lg">Start Your Free Audit</Link>
        </div>
      </section>
    </div>
  );
}
