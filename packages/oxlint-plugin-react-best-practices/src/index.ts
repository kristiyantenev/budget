import { eslintCompatPlugin } from "@oxlint/plugins";
import { advancedEventHandlerRefsRule } from "./rules/advanced-event-handler-refs.ts";
import { bundleAnalyzablePathsRule } from "./rules/bundle-analyzable-paths.ts";
import { clientLocalstorageSchemaRule } from "./rules/client-localstorage-schema.ts";
import { clientPassiveEventListenersRule } from "./rules/client-passive-event-listeners.ts";
import { jsBatchDomCssRule } from "./rules/js-batch-dom-css.ts";
import { jsCombineIterationsRule } from "./rules/js-combine-iterations.ts";
import { jsHoistRegexpRule } from "./rules/js-hoist-regexp.ts";
import { jsIndexMapsRule } from "./rules/js-index-maps.ts";
import { jsMinMaxLoopRule } from "./rules/js-min-max-loop.ts";
import { jsSetMapLookupsRule } from "./rules/js-set-map-lookups.ts";
import { renderingAnimateSvgWrapperRule } from "./rules/rendering-animate-svg-wrapper.ts";
import { renderingConditionalRenderRule } from "./rules/rendering-conditional-render.ts";
import { rerenderDependenciesRule } from "./rules/rerender-dependencies.ts";
import { rerenderDerivedStateRule } from "./rules/rerender-derived-state.ts";
import { rerenderFunctionalSetstateRule } from "./rules/rerender-functional-setstate.ts";
import { rerenderLazyStateInitRule } from "./rules/rerender-lazy-state-init.ts";
import { rerenderSimpleExpressionInMemoRule } from "./rules/rerender-simple-expression-in-memo.ts";
import { rerenderSplitCombinedHooksRule } from "./rules/rerender-split-combined-hooks.ts";
import { serverCacheReactRule } from "./rules/server-cache-react.ts";

export default eslintCompatPlugin({
  meta: { name: "react-best-practices" },
  rules: {
    "advanced-event-handler-refs": advancedEventHandlerRefsRule,
    "bundle-analyzable-paths": bundleAnalyzablePathsRule,
    "client-localstorage-schema": clientLocalstorageSchemaRule,
    "client-passive-event-listeners": clientPassiveEventListenersRule,
    "js-batch-dom-css": jsBatchDomCssRule,
    "js-combine-iterations": jsCombineIterationsRule,
    "js-hoist-regexp": jsHoistRegexpRule,
    "js-index-maps": jsIndexMapsRule,
    "js-min-max-loop": jsMinMaxLoopRule,
    "js-set-map-lookups": jsSetMapLookupsRule,
    "rendering-animate-svg-wrapper": renderingAnimateSvgWrapperRule,
    "rendering-conditional-render": renderingConditionalRenderRule,
    "rerender-dependencies": rerenderDependenciesRule,
    "rerender-derived-state": rerenderDerivedStateRule,
    "rerender-functional-setstate": rerenderFunctionalSetstateRule,
    "rerender-lazy-state-init": rerenderLazyStateInitRule,
    "rerender-simple-expression-in-memo": rerenderSimpleExpressionInMemoRule,
    "rerender-split-combined-hooks": rerenderSplitCombinedHooksRule,
    "server-cache-react": serverCacheReactRule,
  },
});
