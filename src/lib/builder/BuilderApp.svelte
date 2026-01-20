<script>
  import { getContext, setContext } from 'svelte';
	  import PrimaryButton from '$lib/components/PrimaryButton.svelte';
  import SecondaryButton from '$lib/components/SecondaryButton.svelte';
  import Renderer from './Renderer.svelte';
  import { createDefaultDoc, createNode, canHaveChildren } from './ir.js';
	  import {
	    cleanupLayout,
	    findNode,
	    isDescendant,
	    insertNodeSmart,
	    findParent,
	    moveNodeSmart,
	    moveWithinParent,
	    removeNode
	  } from './ops.js';
	  import { serializeDocToSvelte } from './serialize.js';

	  let { initialPage, pageId, onSave, onPromoteToPreview } = $props();

  const editingContext = getContext('editing');
  const editingState = editingContext();
  const prevEditing = editingState.on;
	  $effect(() => {
	    editingState.on = true;
	    return () => {
	      editingState.on = prevEditing;
	    };
	  });

		  const defaultDoc = createDefaultDoc();
		  let doc = $state(defaultDoc);

			  let builder = $state({
			    selectedId: defaultDoc.root.id,
				    hoveredId: null,
				    drop: /** @type {BuilderDrop | null} */ (null)
				  });
			  setContext('builder', () => builder);

			  $effect(() => {
			    if (!initialPage?.doc) return;
			    const nextDoc = structuredClone?.(initialPage.doc) ?? JSON.parse(JSON.stringify(initialPage.doc));
			    doc = nextDoc;
			    builder.selectedId = nextDoc.root.id;
			  });

		  /**
		   * @typedef {null | {
		   *  kind: 'existing' | 'new';
		   *  nodeId?: string;
		   *  newType?: import('./ir.js').BuilderNodeType;
		   *  lastKey: string | null;
		   * }} DragSession
		   */
			  /**
			   * @typedef {'before'|'after'|'inside'|'left'|'right'|'top'|'bottom'} DropWhere
			   *
			   * @typedef {{
			   *  kind: 'line'|'outline'|'ghost';
			   *  x: number;
			   *  y: number;
			   *  width: number;
			   *  height: number;
			   * }} DropIndicator
			   *
			   * @typedef {{
			   *  targetId: string;
			   *  where: DropWhere;
			   *  indicator: DropIndicator | null;
			   *  ghost: DropIndicator | null;
			   * }} BuilderDrop
			   */
		  /** @type {DragSession} */
		  let dragSession = null;

	  /**
	   * @param {import('./ir.js').BuilderNodeType} type
	   */
	  function createNewNode(type) {
	    if (type === 'Container') return createNode('Container', { maxWidth: 'md', padding: 'md' }, []);
	    if (type === 'Text') return createNode('Text', { tag: 'p', text: 'New text' });
	    if (type === 'RichText') return createNode('RichText', { html: '<p>New rich text</p>' });
	    if (type === 'Image')
	      return createNode('Image', { src: '/images/person-placeholder.jpg', alt: 'Image' });
	    if (type === 'Button') return createNode('Button', { kind: 'primary', label: 'Button', href: '#' });
	    if (type === 'Row')
	      return createNode('Row', { gap: 'md', justify: 'start', align: 'center', wrap: true }, []);
	    if (type === 'Stack') return createNode('Stack', { gap: 'md', align: 'stretch' }, []);
	    return createNode('Text', { tag: 'p', text: 'New text' });
	  }

			  const builderActions = {
	    select(id) {
	      builder.selectedId = id;
	    },
    hover(id) {
      builder.hoveredId = id;
    },
	    clearHover() {
	      if (builder.hoveredId) builder.hoveredId = null;
	    },
			    setDrop(targetId, where, indicator = null, ghost = null) {
			      builder.drop = { targetId, where, indicator, ghost };
			    },
		    clearDrop() {
		      if (builder.drop) builder.drop = null;
		    },
	    insertNew(type, targetId, where) {
	      const node = createNewNode(type);
	      const ok = insertNodeSmart(doc.root, node, targetId, where);
	      if (!ok) return null;
	      cleanupLayout(doc.root);
	      builder.selectedId = node.id;
	      return node.id;
	    },
	    moveExisting(nodeId, targetId, where) {
	      const ok = moveNodeSmart(doc.root, nodeId, targetId, where);
	      if (ok) {
	        cleanupLayout(doc.root);
	        builder.selectedId = nodeId;
	      }
	      return ok;
	    },
	    startDragExisting(nodeId) {
	      dragSession = {
	        kind: 'existing',
	        nodeId,
	        lastKey: null
	      };
	    },
	    startDragNew(type) {
	      dragSession = {
	        kind: 'new',
	        newType: type,
	        lastKey: null
	      };
	    },
			    previewDrop(targetId, where, indicator, ghost, force = false) {
			      if (!dragSession) return;

			      const key = `${targetId}:${where}`;
			      if (!force && dragSession.lastKey === key) return;
			      dragSession.lastKey = key;
			      builderActions.setDrop(targetId, where, indicator, ghost);
			    },
	    commitDrop(targetId, where) {
	      if (!dragSession) return;

	      if (dragSession.kind === 'existing') {
	        const movingId = dragSession.nodeId;
	        if (movingId && movingId !== targetId && !isDescendant(doc.root, movingId, targetId)) {
	          const ok = moveNodeSmart(doc.root, movingId, targetId, where);
	          if (ok) builder.selectedId = movingId;
	        }
	      } else {
	        const node = createNewNode(dragSession.newType || 'Text');
	        const ok = insertNodeSmart(doc.root, node, targetId, where);
	        if (ok) builder.selectedId = node.id;
	      }

	      cleanupLayout(doc.root);
	      builderActions.clearDrop();
	    },
	    endDrag() {
	      builderActions.clearDrop();
	      if (!dragSession) return;

	      dragSession = null;
	    }
	  };
	  setContext('builderActions', builderActions);

  const selectedNode = $derived.by(() => findNode(doc.root, builder.selectedId) || doc.root);
  const selectedIsContainer = $derived.by(() => canHaveChildren(selectedNode.type));
  const selectedParentType = $derived.by(() => {
    if (builder.selectedId === doc.root.id) return null;
    const parentInfo = findParent(doc.root, builder.selectedId);
    return parentInfo?.parent?.type || null;
  });

	  let saving = $state(false);
	  let promoting = $state(false);
	  let showLibrary = $state(false);
	  let showProps = $state(true);
	  let viewport = $state('full');
	  const viewportClass = $derived.by(() => {
	    if (viewport === 'mobile') return 'w-full max-w-[420px]';
	    if (viewport === 'tablet') return 'w-full max-w-[820px]';
	    if (viewport === 'desktop') return 'w-full max-w-[1280px]';
	    return 'w-full';
	  });
	  const viewportFrameClass = $derived.by(() => {
	    if (viewport === 'full') return '';
	    return 'bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden';
	  });
	  const canvasClass = $derived.by(() => {
	    const bg = viewport === 'full' ? 'bg-white' : 'bg-gray-50';
	    const pad = viewport === 'full' ? 'p-0' : 'p-6';
	    return `relative ${bg} ${pad} min-h-[60vh]`;
	  });

		  function startDragNew(e, type) {
		    e.dataTransfer.effectAllowed = 'copy';
		    e.dataTransfer.setData('application/x-builder-new', type);
		    builderActions.startDragNew(type);
		  }

			  const DROP_LINE_THICKNESS = 4;
			  const DROP_EDGE_HOTSPOT_PX = 28;

			  /**
			   * @param {string} nodeId
			   * @returns {DOMRect | null}
		   */
		  function getNodeRect(nodeId) {
		    const el = document.querySelector(`[data-editor-node-id="${nodeId}"]`);
		    return el?.getBoundingClientRect?.() || null;
		  }

		  /**
		   * @param {DOMRect} canvasRect
		   * @param {DOMRect} r
		   * @returns {DropIndicator}
		   */
		  function outlineIndicator(canvasRect, r) {
		    return {
		      kind: 'outline',
		      x: r.left - canvasRect.left,
		      y: r.top - canvasRect.top,
		      width: r.width,
		      height: r.height
		    };
		  }

		  /**
		   * @param {DOMRect} canvasRect
		   * @param {DOMRect} r
		   * @param {number} boundaryY
		   * @returns {DropIndicator}
		   */
		  function hLineIndicator(canvasRect, r, boundaryY) {
		    return {
		      kind: 'line',
		      x: r.left - canvasRect.left,
		      y: boundaryY - canvasRect.top - DROP_LINE_THICKNESS / 2,
		      width: r.width,
		      height: DROP_LINE_THICKNESS
		    };
		  }

		  /**
		   * @param {DOMRect} canvasRect
		   * @param {DOMRect} r
		   * @param {number} boundaryX
		   * @returns {DropIndicator}
		   */
			  function vLineIndicator(canvasRect, r, boundaryX) {
			    return {
			      kind: 'line',
			      x: boundaryX - canvasRect.left - DROP_LINE_THICKNESS / 2,
			      y: r.top - canvasRect.top,
			      width: DROP_LINE_THICKNESS,
			      height: r.height
			    };
			  }

			  /**
			   * @param {HTMLElement} canvasEl
			   * @param {number} clientX
			   * @param {number} clientY
			   * @returns {{ targetId: string; where: DropWhere; indicator: DropIndicator | null; ghost: DropIndicator | null }}
			   */
			  function computeDropIntent(canvasEl, clientX, clientY) {
			    const canvasRect = canvasEl.getBoundingClientRect();

		    const hit = document.elementFromPoint(clientX, clientY);
		    const wrapper = hit?.closest?.('[data-editor-node-id]');
		    const hitId = wrapper?.getAttribute?.('data-editor-node-id') || doc.root.id;

		    const hitRect = wrapper?.getBoundingClientRect?.() || getNodeRect(hitId) || null;
		    const hitNode = findNode(doc.root, hitId) || doc.root;

			    if (!hitRect) {
			      const rootRect = getNodeRect(doc.root.id);
			      return {
			        targetId: doc.root.id,
			        where: 'inside',
			        indicator: rootRect ? outlineIndicator(canvasRect, rootRect) : null,
			        ghost: null
			      };
			    }

		    const xRatio = (clientX - hitRect.left) / (hitRect.width || 1);
		    const yRatio = (clientY - hitRect.top) / (hitRect.height || 1);

			    const isHitContainer = canHaveChildren(hitNode.type);

			    /**
			     * @returns {{ width: number; height: number }}
			     */
			    const previewSize = () => {
			      if (dragSession?.kind === 'existing' && dragSession.nodeId) {
			        const r = getNodeRect(dragSession.nodeId);
			        if (r) return { width: r.width, height: r.height };
			      }

			      const type = dragSession?.kind === 'new' ? dragSession.newType : null;
			      if (type === 'Button') return { width: 140, height: 44 };
			      if (type === 'Image') return { width: 240, height: 160 };
			      if (type === 'RichText') return { width: 360, height: 140 };
			      if (type === 'Container') return { width: 560, height: 280 };
			      return { width: 280, height: 44 };
			    };

			    /**
			     * @param {DOMRect} containerRect
			     * @param {DropIndicator} line
			     * @returns {DropIndicator | null}
			     */
			    const ghostForLine = (containerRect, line) => {
			      if (line.kind !== 'line') return null;
			      const preview = previewSize();

			      const containerX = containerRect.left - canvasRect.left;
			      const containerY = containerRect.top - canvasRect.top;

			      const w = Math.max(24, Math.min(preview.width, containerRect.width));
			      const h = Math.max(16, Math.min(preview.height, containerRect.height));

			      const isVertical = line.height > line.width;

			      if (isVertical) {
			        const centerX = line.x + line.width / 2;
			        let x = centerX - w / 2;
			        x = Math.max(containerX, Math.min(x, containerX + containerRect.width - w));
			        const y = containerY + (containerRect.height - h) / 2;
			        return { kind: 'ghost', x, y, width: w, height: h };
			      }

			      const centerY = line.y + line.height / 2;
			      const x = containerX + (containerRect.width - w) / 2;
			      let y = centerY - h / 2;
			      y = Math.max(containerY, Math.min(y, containerY + containerRect.height - h));
			      return { kind: 'ghost', x, y, width: w, height: h };
			    };

			    /**
			     * @param {import('./ir.js').BuilderNode[]} children
			     * @param {'x'|'y'} axis
			     */
		    const insertionIndex = (children, axis) => {
		      const pointer = axis === 'x' ? clientX : clientY;
		      let index = 0;
		      for (const child of children) {
		        const r = getNodeRect(child.id);
		        if (!r) continue;
		        const mid = axis === 'x' ? r.left + r.width / 2 : r.top + r.height / 2;
		        if (pointer > mid) index++;
		      }
		      return index;
		    };

		    /**
		     * @param {DOMRect | null} prev
		     * @param {DOMRect | null} next
		     * @returns {number | null}
		     */
		    const boundaryX = (prev, next) => {
		      if (prev && next) return (prev.right + next.left) / 2;
		      if (next) return next.left;
		      if (prev) return prev.right;
		      return null;
		    };

		    /**
		     * @param {DOMRect | null} prev
		     * @param {DOMRect | null} next
		     * @returns {number | null}
		     */
		    const boundaryY = (prev, next) => {
		      if (prev && next) return (prev.bottom + next.top) / 2;
		      if (next) return next.top;
		      if (prev) return prev.bottom;
		      return null;
		    };

		    // Prefer dropping *into* a container if the pointer is near its center.
		    if (
		      isHitContainer &&
		      xRatio > 0.25 &&
		      xRatio < 0.75 &&
		      yRatio > 0.25 &&
		      yRatio < 0.75
		    ) {
		      const children = hitNode.children || [];
			      if (children.length === 0) {
			        const outline = outlineIndicator(canvasRect, hitRect);
			        return {
			          targetId: hitNode.id,
			          where: 'inside',
			          indicator: outline,
			          ghost: null
			        };
			      }

		      const axis = hitNode.type === 'Row' ? 'x' : 'y';
		      const index = insertionIndex(children, axis);
		      const prev = index > 0 ? getNodeRect(children[index - 1].id) : null;
		      const next = index < children.length ? getNodeRect(children[index].id) : null;

			      if (hitNode.type === 'Row') {
			        const anchor = index >= children.length ? children[children.length - 1] : children[index];
			        const where = index >= children.length ? 'right' : 'left';
			        const bx = boundaryX(prev, next) ?? clientX;
			        const line = vLineIndicator(canvasRect, hitRect, bx);
			        return {
			          targetId: anchor.id,
			          where,
			          indicator: line,
			          ghost: ghostForLine(hitRect, line)
			        };
			      }

			      if (hitNode.type === 'Stack') {
			        const anchor = index >= children.length ? children[children.length - 1] : children[index];
			        const where = index >= children.length ? 'bottom' : 'top';
			        const by = boundaryY(prev, next) ?? clientY;
			        const line = hLineIndicator(canvasRect, hitRect, by);
			        return {
			          targetId: anchor.id,
			          where,
			          indicator: line,
			          ghost: ghostForLine(hitRect, line)
			        };
			      }

			      const anchor = index >= children.length ? children[children.length - 1] : children[index];
			      const where = index >= children.length ? 'after' : 'before';
			      const by = boundaryY(prev, next) ?? clientY;
			      const line = hLineIndicator(canvasRect, hitRect, by);
			      return {
			        targetId: anchor.id,
			        where,
			        indicator: line,
			        ghost: ghostForLine(hitRect, line)
			      };
			    }

		    // Otherwise, decide based on the parent container + cross-axis edges for wrapping.
		    const parentInfo = findParent(doc.root, hitId);
			    if (!parentInfo) {
			      const rootRect = getNodeRect(doc.root.id);
			      const outline = rootRect ? outlineIndicator(canvasRect, rootRect) : null;
			      return {
			        targetId: doc.root.id,
			        where: 'inside',
			        indicator: outline,
			        ghost: null
			      };
			    }

			    const parent = parentInfo.parent;
			    const parentRect = getNodeRect(parent.id) || hitRect;

			    // Cross-axis: trigger Row/Stack creation around the hit node.
			    if (parent.type === 'Row') {
			      const edge = Math.min(DROP_EDGE_HOTSPOT_PX, hitRect.height * 0.25);
			      if (clientY - hitRect.top <= edge) {
			        const line = hLineIndicator(canvasRect, hitRect, hitRect.top);
			        return {
			          targetId: hitId,
			          where: 'top',
			          indicator: line,
			          ghost: ghostForLine(hitRect, line)
			        };
			      }
			      if (hitRect.bottom - clientY <= edge) {
			        const line = hLineIndicator(canvasRect, hitRect, hitRect.bottom);
			        return {
			          targetId: hitId,
			          where: 'bottom',
			          indicator: line,
			          ghost: ghostForLine(hitRect, line)
			        };
			      }
			    } else if (parent.type === 'Stack' || parent.type === 'Container') {
			      const edge = Math.min(DROP_EDGE_HOTSPOT_PX, hitRect.width * 0.25);
			      if (clientX - hitRect.left <= edge) {
			        const line = vLineIndicator(canvasRect, hitRect, hitRect.left);
			        return {
			          targetId: hitId,
			          where: 'left',
			          indicator: line,
			          ghost: ghostForLine(hitRect, line)
			        };
			      }
			      if (hitRect.right - clientX <= edge) {
			        const line = vLineIndicator(canvasRect, hitRect, hitRect.right);
			        return {
			          targetId: hitId,
			          where: 'right',
			          indicator: line,
			          ghost: ghostForLine(hitRect, line)
			        };
			      }
			    }

			    // Main axis: insert between siblings by gap index.
			    const siblings = parent.children || [];
			    if (siblings.length === 0) {
			      const outline = outlineIndicator(canvasRect, parentRect);
			      return {
			        targetId: parent.id,
			        where: 'inside',
			        indicator: outline,
			        ghost: null
			      };
			    }

		    const axis = parent.type === 'Row' ? 'x' : 'y';
		    const index = insertionIndex(siblings, axis);
		    const prev = index > 0 ? getNodeRect(siblings[index - 1].id) : null;
		    const next = index < siblings.length ? getNodeRect(siblings[index].id) : null;

			    if (parent.type === 'Row') {
			      const anchor = index >= siblings.length ? siblings[siblings.length - 1] : siblings[index];
			      const where = index >= siblings.length ? 'right' : 'left';
			      const bx = boundaryX(prev, next) ?? clientX;
			      const line = vLineIndicator(canvasRect, parentRect, bx);
			      return {
			        targetId: anchor.id,
			        where,
			        indicator: line,
			        ghost: ghostForLine(parentRect, line)
			      };
			    }

			    if (parent.type === 'Stack') {
			      const anchor = index >= siblings.length ? siblings[siblings.length - 1] : siblings[index];
			      const where = index >= siblings.length ? 'bottom' : 'top';
			      const by = boundaryY(prev, next) ?? clientY;
			      const line = hLineIndicator(canvasRect, parentRect, by);
			      return {
			        targetId: anchor.id,
			        where,
			        indicator: line,
			        ghost: ghostForLine(parentRect, line)
			      };
			    }

			    const anchor = index >= siblings.length ? siblings[siblings.length - 1] : siblings[index];
			    const where = index >= siblings.length ? 'after' : 'before';
			    const by = boundaryY(prev, next) ?? clientY;
			    const line = hLineIndicator(canvasRect, parentRect, by);
			    return {
			      targetId: anchor.id,
			      where,
			      indicator: line,
			      ghost: ghostForLine(parentRect, line)
			    };
			  }

		  /**
		   * @param {DragEvent} e
		   */
			  function onCanvasDragOver(e) {
			    if (!dragSession) return;
			    e.preventDefault();
			    const intent = computeDropIntent(/** @type {HTMLElement} */ (e.currentTarget), e.clientX, e.clientY);
			    builderActions.previewDrop(intent.targetId, intent.where, intent.indicator, intent.ghost);
			  }

	  /**
	   * @param {DragEvent} e
	   */
		  function onCanvasDrop(e) {
		    if (!dragSession) return;
		    e.preventDefault();
		    const intent = computeDropIntent(/** @type {HTMLElement} */ (e.currentTarget), e.clientX, e.clientY);
		    builderActions.commitDrop(intent.targetId, intent.where);
		  }

	  function onCanvasDragLeave(e) {
	    if (!dragSession) return;
	    const to = /** @type {Element | null} */ (e.relatedTarget);
	    if (to && e.currentTarget.contains(to)) return;
	    builderActions.clearDrop();
	  }

  function addBlock(type) {
    const where = selectedIsContainer ? 'inside' : 'after';
    builderActions.insertNew(type, builder.selectedId, where);
  }

	  function deleteSelected() {
	    if (builder.selectedId === doc.root.id) return;
	    const ok = removeNode(doc.root, builder.selectedId);
	    if (ok) {
	      cleanupLayout(doc.root);
	      builder.selectedId = doc.root.id;
	    }
	  }

	  function moveSelected(direction) {
	    if (builder.selectedId === doc.root.id) return;
	    const ok = moveWithinParent(doc.root, builder.selectedId, direction);
	    if (ok) cleanupLayout(doc.root);
	  }

  async function save() {
    saving = true;
    try {
      const page = {
        kind: 'virtual-svelte-page',
        version: 1,
        doc: $state.snapshot(doc),
        svelte: serializeDocToSvelte($state.snapshot(doc))
      };
      await onSave({ pageId, page });
    } finally {
      saving = false;
    }
  }

	  async function promoteToPreview() {
	    promoting = true;
	    try {
	      await onPromoteToPreview(pageId);
	    } finally {
	      promoting = false;
	    }
	  }
	</script>

<div class="min-h-screen">
  <div class="sticky top-0 z-20 bg-white/80 backdrop-blur border-b border-gray-100">
    <div class="max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
      <div>
        <div class="text-sm text-gray-500">Builder</div>
        <div class="text-xl font-bold">{pageId}</div>
	      </div>
	      <div class="flex items-center gap-2">
	        <div class="hidden lg:flex items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
	          {#each [
	            { id: 'full', label: 'Full' },
	            { id: 'desktop', label: 'Desktop' },
	            { id: 'tablet', label: 'Tablet' },
	            { id: 'mobile', label: 'Mobile' }
	          ] as vp (vp.id)}
	            <button
	              type="button"
	              class={`px-2 py-1 text-sm rounded-md ${
	                viewport === vp.id
	                  ? 'bg-gray-900 text-white'
	                  : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
	              }`}
	              onclick={() => (viewport = vp.id)}
	            >
	              {vp.label}
	            </button>
	          {/each}
	        </div>
		        <SecondaryButton type="button" disabled={promoting || saving} onclick={() => (showLibrary = true)}
		          >Components</SecondaryButton
		        >
		        <SecondaryButton type="button" disabled={promoting || saving} onclick={() => (showProps = !showProps)}
		          >{showProps ? 'Hide properties' : 'Show properties'}</SecondaryButton
		        >
		        <SecondaryButton type="button" disabled={promoting || saving} onclick={promoteToPreview}
		          >Promote to preview</SecondaryButton
		        >
		        <PrimaryButton type="button" disabled={saving || promoting} onclick={save}
		          >{saving ? 'Saving…' : 'Save draft'}</PrimaryButton
		        >
      </div>
    </div>
  </div>

	  <div class="w-full px-6 py-6">
	    <div class={`grid grid-cols-1 ${showProps ? 'lg:grid-cols-[1fr_380px]' : ''} gap-8 pb-16`}>
	      <div
	        class={canvasClass}
	        onclick={() => (builder.selectedId = doc.root.id)}
	        role="button"
	        tabindex="0"
	        aria-label="Select page root"
	        ondragover={onCanvasDragOver}
	        ondrop={onCanvasDrop}
	        ondragleave={onCanvasDragLeave}
	        onkeydown={(e) => {
	          if (e.key === 'Enter' || e.key === ' ') {
	            e.preventDefault();
	            builder.selectedId = doc.root.id;
	          }
	        }}
	      >
		        <div class={`mx-auto ${viewportClass} ${viewportFrameClass}`}>
		          <Renderer node={doc.root} />
		        </div>
		        {#if builder.drop?.ghost}
		          <div
		            class="pointer-events-none absolute border-2 border-dashed border-emerald-400/60 bg-emerald-100/20 rounded-lg"
		            style={`left:${builder.drop.ghost.x}px;top:${builder.drop.ghost.y}px;width:${builder.drop.ghost.width}px;height:${builder.drop.ghost.height}px;`}
		          ></div>
		        {/if}
		        {#if builder.drop?.indicator}
		          {#if builder.drop.indicator.kind === 'outline'}
		            <div
		              class="pointer-events-none absolute border-2 border-dashed border-emerald-400 rounded-lg"
		              style={`left:${builder.drop.indicator.x}px;top:${builder.drop.indicator.y}px;width:${builder.drop.indicator.width}px;height:${builder.drop.indicator.height}px;`}
		            ></div>
		          {:else if builder.drop.indicator.kind === 'line'}
		            <div
		              class="pointer-events-none absolute bg-emerald-400 rounded"
		              style={`left:${builder.drop.indicator.x}px;top:${builder.drop.indicator.y}px;width:${builder.drop.indicator.width}px;height:${builder.drop.indicator.height}px;`}
		            ></div>
		          {/if}
		        {/if}
		      </div>

	      {#if showProps}
	        <aside class="bg-white border border-gray-100 rounded-xl p-4">
	        <div class="flex items-center justify-between gap-4 pb-3">
	          <div class="text-sm font-bold">Properties</div>
	          <div class="text-xs text-gray-500">
	            {selectedIsContainer ? 'container' : 'leaf'}
          </div>
        </div>

        <div class="text-sm text-gray-600 pb-4">
          <div><span class="font-semibold">type</span>: {selectedNode.type}</div>
          <div>
            <span class="font-semibold">id</span>:
            <span class="font-mono text-xs">{selectedNode.id}</span>
          </div>
        </div>

        <div class="flex items-center gap-2 pb-6">
          <SecondaryButton
            type="button"
            disabled={builder.selectedId === doc.root.id}
            onclick={() => moveSelected('up')}
            >{selectedParentType === 'Row' ? 'Left' : 'Up'}</SecondaryButton
          >
          <SecondaryButton
            type="button"
            disabled={builder.selectedId === doc.root.id}
            onclick={() => moveSelected('down')}
            >{selectedParentType === 'Row' ? 'Right' : 'Down'}</SecondaryButton
          >
          <SecondaryButton
            type="button"
            disabled={builder.selectedId === doc.root.id}
            onclick={deleteSelected}
            >Delete</SecondaryButton
          >
        </div>

        {#if selectedNode.type === 'Text'}
          <div class="space-y-2">
            <div class="text-sm font-bold">Text</div>
            <label class="text-sm text-gray-600 block" for="builder-text-tag">Tag</label>
            <select
              id="builder-text-tag"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.tag}
              onchange={(e) => (selectedNode.props.tag = e.currentTarget.value)}
            >
              <option value="p">p</option>
              <option value="h1">h1</option>
              <option value="h2">h2</option>
            </select>
            <label class="text-sm text-gray-600 block pt-2" for="builder-text-align">Align</label>
            <select
              id="builder-text-align"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.align || 'left'}
              onchange={(e) => (selectedNode.props.align = e.currentTarget.value)}
            >
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </div>
        {:else if selectedNode.type === 'Container'}
          <div class="space-y-2">
            <div class="text-sm font-bold">Container</div>
            <label class="text-sm text-gray-600 block" for="builder-container-max-width">Max width</label>
            <select
              id="builder-container-max-width"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.maxWidth}
              onchange={(e) => (selectedNode.props.maxWidth = e.currentTarget.value)}
            >
              <option value="full">full</option>
              <option value="sm">sm</option>
              <option value="md">md</option>
              <option value="lg">lg</option>
              <option value="xl">xl</option>
            </select>
            <label class="text-sm text-gray-600 block pt-2" for="builder-container-padding">Padding</label>
            <select
              id="builder-container-padding"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.padding || 'md'}
              onchange={(e) => (selectedNode.props.padding = e.currentTarget.value)}
            >
              <option value="sm">sm</option>
              <option value="md">md</option>
              <option value="lg">lg</option>
            </select>
          </div>
        {:else if selectedNode.type === 'Stack'}
          <div class="space-y-2">
            <div class="text-sm font-bold">Stack</div>
            <label class="text-sm text-gray-600 block" for="builder-stack-gap">Gap</label>
            <select
              id="builder-stack-gap"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.gap}
              onchange={(e) => (selectedNode.props.gap = e.currentTarget.value)}
            >
              <option value="sm">sm</option>
              <option value="md">md</option>
              <option value="lg">lg</option>
            </select>
            <label class="text-sm text-gray-600 block pt-2" for="builder-stack-align">Align</label>
            <select
              id="builder-stack-align"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.align || 'stretch'}
              onchange={(e) => (selectedNode.props.align = e.currentTarget.value)}
            >
              <option value="stretch">stretch</option>
              <option value="start">start</option>
              <option value="center">center</option>
              <option value="end">end</option>
            </select>
          </div>
        {:else if selectedNode.type === 'Row'}
          <div class="space-y-2">
            <div class="text-sm font-bold">Row</div>
            <label class="text-sm text-gray-600 block" for="builder-row-gap">Gap</label>
            <select
              id="builder-row-gap"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.gap}
              onchange={(e) => (selectedNode.props.gap = e.currentTarget.value)}
            >
              <option value="sm">sm</option>
              <option value="md">md</option>
              <option value="lg">lg</option>
            </select>
            <label class="text-sm text-gray-600 block pt-2" for="builder-row-justify">Justify</label>
            <select
              id="builder-row-justify"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.justify || 'start'}
              onchange={(e) => (selectedNode.props.justify = e.currentTarget.value)}
            >
              <option value="start">start</option>
              <option value="center">center</option>
              <option value="end">end</option>
              <option value="between">between</option>
              <option value="around">around</option>
              <option value="evenly">evenly</option>
            </select>
            <label class="text-sm text-gray-600 block pt-2" for="builder-row-align">Align</label>
            <select
              id="builder-row-align"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.align || 'center'}
              onchange={(e) => (selectedNode.props.align = e.currentTarget.value)}
            >
              <option value="stretch">stretch</option>
              <option value="start">start</option>
              <option value="center">center</option>
              <option value="end">end</option>
            </select>
            <div class="flex items-center gap-2 pt-2">
              <input
                id="builder-row-wrap"
                type="checkbox"
                class="h-4 w-4"
                checked={selectedNode.props.wrap !== false}
                onchange={(e) => (selectedNode.props.wrap = e.currentTarget.checked)}
              />
              <label class="text-sm text-gray-600" for="builder-row-wrap">Wrap</label>
            </div>
          </div>
        {:else if selectedNode.type === 'Image'}
          <div class="space-y-2">
            <div class="text-sm font-bold">Image</div>
            <label class="text-sm text-gray-600 block" for="builder-image-src">Src</label>
            <input
              id="builder-image-src"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.src}
              oninput={(e) => (selectedNode.props.src = e.currentTarget.value)}
            />
            <label class="text-sm text-gray-600 block pt-2" for="builder-image-alt">Alt</label>
            <input
              id="builder-image-alt"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.alt}
              oninput={(e) => (selectedNode.props.alt = e.currentTarget.value)}
            />
          </div>
        {:else if selectedNode.type === 'RichText'}
          <div class="space-y-2">
            <div class="text-sm font-bold">RichText</div>
            <label class="text-sm text-gray-600 block" for="builder-richtext-align">Align</label>
            <select
              id="builder-richtext-align"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.align || 'left'}
              onchange={(e) => (selectedNode.props.align = e.currentTarget.value)}
            >
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </div>
        {:else if selectedNode.type === 'Button'}
          <div class="space-y-2">
            <div class="text-sm font-bold">Button</div>
            <label class="text-sm text-gray-600 block" for="builder-button-kind">Kind</label>
            <select
              id="builder-button-kind"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.kind}
              onchange={(e) => (selectedNode.props.kind = e.currentTarget.value)}
            >
              <option value="primary">primary</option>
              <option value="secondary">secondary</option>
            </select>
            <label class="text-sm text-gray-600 block pt-2" for="builder-button-size">Size</label>
            <select
              id="builder-button-size"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.size || 'default'}
              onchange={(e) => (selectedNode.props.size = e.currentTarget.value)}
            >
              <option value="sm">sm</option>
              <option value="default">default</option>
              <option value="lg">lg</option>
            </select>
            <label class="text-sm text-gray-600 block pt-2" for="builder-button-label">Label</label>
            <input
              id="builder-button-label"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.label}
              oninput={(e) => (selectedNode.props.label = e.currentTarget.value)}
            />
            <label class="text-sm text-gray-600 block pt-2" for="builder-button-href">Href</label>
            <input
              id="builder-button-href"
              class="w-full border border-gray-200 rounded px-3 py-2 text-sm"
              value={selectedNode.props.href}
              oninput={(e) => (selectedNode.props.href = e.currentTarget.value)}
            />
          </div>
        {/if}
        </aside>
      {/if}
    </div>
  </div>

  {#if showLibrary}
    <div class="fixed inset-0 z-30">
      <button
        type="button"
        class="absolute inset-0 bg-black/30"
        onclick={() => (showLibrary = false)}
        aria-label="Close component library"
      ></button>
      <div class="absolute inset-y-0 left-0 w-[360px] bg-white border-r border-gray-100 p-4 overflow-auto">
        <div class="flex items-center justify-between gap-4 pb-4">
          <div class="text-sm font-bold">Components</div>
          <SecondaryButton type="button" onclick={() => (showLibrary = false)}>Close</SecondaryButton>
        </div>
        <div class="text-xs text-gray-500 pb-4">
          Drag a component onto the page, or click to insert.
        </div>

        <div class="space-y-6">
          <div>
            <div class="text-xs font-bold text-gray-500 pb-2">Layout</div>
            <div class="flex flex-wrap gap-2">
	              <button
	                type="button"
	                class="text-sm border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 active:bg-gray-100"
	                draggable="true"
	                ondragstart={(e) => startDragNew(e, 'Container')}
	                ondragend={() => builderActions.endDrag()}
	                onclick={() => addBlock('Container')}
	              >
	                Container
	              </button>
	              <button
	                type="button"
	                class="text-sm border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 active:bg-gray-100"
	                draggable="true"
	                ondragstart={(e) => startDragNew(e, 'Stack')}
	                ondragend={() => builderActions.endDrag()}
	                onclick={() => addBlock('Stack')}
	              >
	                Stack
	              </button>
	              <button
	                type="button"
	                class="text-sm border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 active:bg-gray-100"
	                draggable="true"
	                ondragstart={(e) => startDragNew(e, 'Row')}
	                ondragend={() => builderActions.endDrag()}
	                onclick={() => addBlock('Row')}
	              >
	                Row
	              </button>
            </div>
          </div>
          <div>
            <div class="text-xs font-bold text-gray-500 pb-2">Content</div>
            <div class="flex flex-wrap gap-2">
	              <button
	                type="button"
	                class="text-sm border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 active:bg-gray-100"
	                draggable="true"
	                ondragstart={(e) => startDragNew(e, 'Text')}
	                ondragend={() => builderActions.endDrag()}
	                onclick={() => addBlock('Text')}
	              >
	                Text
	              </button>
	              <button
	                type="button"
	                class="text-sm border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 active:bg-gray-100"
	                draggable="true"
	                ondragstart={(e) => startDragNew(e, 'RichText')}
	                ondragend={() => builderActions.endDrag()}
	                onclick={() => addBlock('RichText')}
	              >
	                RichText
	              </button>
	              <button
	                type="button"
	                class="text-sm border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 active:bg-gray-100"
	                draggable="true"
	                ondragstart={(e) => startDragNew(e, 'Image')}
	                ondragend={() => builderActions.endDrag()}
	                onclick={() => addBlock('Image')}
	              >
	                Image
	              </button>
	              <button
	                type="button"
	                class="text-sm border border-gray-200 rounded px-3 py-2 hover:bg-gray-50 active:bg-gray-100"
	                draggable="true"
	                ondragstart={(e) => startDragNew(e, 'Button')}
	                ondragend={() => builderActions.endDrag()}
	                onclick={() => addBlock('Button')}
	              >
	                Button
	              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>
