import * as React from "react";
import reactLogo from "../assets/react.svg";
import "./_index.css";

export function IndexRoute() {
	let [count, setCount] = React.useState(0);

	return (
		<>
			<div className="logos">
				<a href="https://vitejs.dev" target="_blank" rel="noreferrer">
					<img src="/vite.svg" className="logo" alt="Vite logo" />
				</a>
				<a href="https://reactjs.org" target="_blank" rel="noreferrer">
					<img src={reactLogo} className="logo react" alt="React logo" />
				</a>
			</div>
			<h1>Vite + React</h1>
			<div className="card">
				<button
					onClick={() => setCount((count) => count + 1)}
					className="count"
				>
					count is {count}
				</button>
				<p>
					Edit <code>src/app.tsx</code> and save to test HMR
				</p>
			</div>
			<p className="read-the-docs">
				Click on the Vite and React logos to learn more
			</p>
		</>
	);
}
