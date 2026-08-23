<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Cryma</title>
        <script type="module" src="http://127.0.0.1:5173/{{ chr(64) }}vite/client"></script>
        <script type="module">
            import RefreshRuntime from "http://127.0.0.1:5173/{{ chr(64) }}react-refresh";
            RefreshRuntime.injectIntoGlobalHook(window);
            window.$RefreshReg$ = () => {};
            window.$RefreshSig$ = () => (type) => type;
            window.__vite_plugin_react_preamble_installed__ = true;
        </script>
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="http://127.0.0.1:5173/src/main.jsx"></script>
    </body>
</html>