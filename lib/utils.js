import ProxyAgent from "proxy-agent";

const defaultAgent = new ProxyAgent();
const httpsAgent = new ProxyAgent();
httpsAgent.protocol = "https:";

/**
 * @param {string} url
 */
export function agent(url) {
	return new URL(url).protocol === "https:" ? httpsAgent : defaultAgent;
}

/**
 * @param {string} url
 */
export function getModulePaths(url) {
	let result = new URL(url);
	let pathname = result.pathname;
	let pathArray = pathname.split("/");
	let basename = pathArray.pop();
	let dirname = pathArray.join("/");
	return { pathname, dirname, basename };
}
