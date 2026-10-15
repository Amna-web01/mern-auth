export default function Navbar() {
  return (
    <nav className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md">
      <h1 className="font-bold text-lg">MERN Auth App</h1>
      <div className="flex gap-4">
        <a href="/login" className="hover:text-amber-400 transition">Login</a>
        <a href="/register" className="hover:text-amber-400 transition">Register</a>
      </div>
    </nav>
  );
}