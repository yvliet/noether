// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "windows")]
    {
        // Architectural Rationale:
        // 1. In-process GPU folds DirectX/ANGLE compositing into the browser coordinator thread,
        //    eliminating a standalone 150-200MB gpu-process without losing hardware acceleration.
        // 2. Disabling unused consumer web-browser subsystems (MediaRouter, Translate, BackForwardCache)
        //    strips background network listeners, prediction engines, and page snapshot caches.
        // 3. V8 old-space limit and size optimization trigger generational GC earlier to keep heap lean.
        // 4. Bounded cache caps prevent unbounded memory and disk allocation over extended sessions.
        let browser_args = [
            "--in-process-gpu",
            "--renderer-process-limit=1",
            "--disable-features=Translate,OptimizationHints,MediaRouter,BackForwardCache,AutofillServerCommunication,CalculateNativeWinOcclusion",
            "--disable-background-networking",
            "--disable-component-update",
            "--disk-cache-size=10485760",
            "--media-cache-size=5242880",
            "--js-flags=\"--max-old-space-size=128 --optimize-for-size\"",
        ].join(" ");

        std::env::set_var("WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS", browser_args);
    }

    flint_lib::run();
}

