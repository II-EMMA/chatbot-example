import { useEffect, useState } from "react";
import "./App.css";
import { Button } from "./components/ui/button";

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
      <div className="flex justify-center ">
        <Button variant="outline">Click me</Button>
      </div>
    </>
  );
}

export default App;
