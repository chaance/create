import * as React from "react";
import { Outlet } from "react-router-dom";
import "./app.css";

export function App() {
	return (
		<div className="app">
			<Outlet />
		</div>
	);
}
