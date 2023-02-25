import * as React from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { App as Root } from "./app";
import { IndexRoute } from "./routes/_index";
import "./reset.css";
import "./main.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
	throw new Error("No root element found");
}

const router = createBrowserRouter([
	{
		element: <Root />,
		children: [
			{
				path: "/",
				element: <IndexRoute />,
			},
		],
	},
]);

createRoot(rootElement).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>
);
