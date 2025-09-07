import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [message, setMessage] = useState<string>("");
  useEffect(() => {
    fetch("/api/hello")
      .then((res) => res.json())
      .then((data) => setMessage(data.message));
  }, []);
  console.log(message);
  return (
    <>
      <p className="bg-black text-white p-5">{message}</p>
    </>
  );
}

export default App;
