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
      <p>{message}</p>
    </>
  );
}

export default App;
