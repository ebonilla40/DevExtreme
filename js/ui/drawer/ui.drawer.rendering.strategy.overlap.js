import { animation } from './ui.drawer.rendering.strategy';
import DrawerStrategy from './ui.drawer.rendering.strategy';
import $ from '../../core/renderer';
import translator from '../../animation/translator';
import Overlay from '../overlay';
import { ensureDefined } from '../../core/utils/common';
import { extend } from '../../core/utils/extend';
import { isDefined } from '../../core/utils/type';
import { camelize } from '../../core/utils/inflector';
import * as zIndexPool from '../overlay/z_index';

class OverlapStrategy extends DrawerStrategy {

    renderPanelContent(whenPanelContentRendered) {
        delete this._initialPosition;

        const drawer = this.getDrawerInstance();
        const { opened, minSize } = drawer.option();

        drawer._overlay = drawer._createComponent(drawer.content(), Overlay, {
            shading: false,
            container: drawer.getOverlayTarget(),
            position: this._getOverlayPosition(),
            width: opened ? 'auto' : minSize || 0,
            height: '100%',
            templatesRenderAsynchronously: drawer.option('templatesRenderAsynchronously'),
            animation: {
                show: {
                    duration: 0
                }
            },
            onPositioned: (function(e) {
                this._fixOverlayPosition(e.component.$content());
            }).bind(this),
            contentTemplate: drawer.option('template'),
            onContentReady: () => {
                whenPanelContentRendered.resolve();
                drawer.updateZIndex(opened);
            },
            visible: true,
            propagateOutsideClick: true
        });
    }

    _fixOverlayPosition($overlayContent) {
        // NOTE: overlay should be positioned in extended wrapper
        const position = ensureDefined(this._initialPosition, { left: 0, top: 0 });
        translator.move($overlayContent, position);

        if(this.getDrawerInstance().calcTargetPosition() === 'right') {
            $overlayContent.css('left', 'auto');
        }
    }

    _getOverlayPosition() {
        const drawer = this.getDrawerInstance();
        const panelPosition = drawer.calcTargetPosition();

        let result = {};

        switch(panelPosition) {
            case 'left': {
                result = {
                    my: 'top left',
                    at: 'top left',
                };
                break;
            }
            case 'right': {
                result = {
                    my: drawer.option('rtlEnabled') ? 'top left' : 'top right',
                    at: 'top right',
                };
                break;
            }
            case 'top':
            case 'bottom': {
                result = {
                    my: panelPosition,
                    at: panelPosition,
                };
                break;
            }
        }

        result.of = drawer.getOverlayTarget();

        return result;
    }

    refreshPanelElementSize(calcFromRealPanelSize) {
        const drawer = this.getDrawerInstance();
        const overlay = drawer.getOverlay();

        if(drawer.isHorizontalDirection()) {
            overlay.option('height', '100%');
            overlay.option('width', calcFromRealPanelSize ? drawer.getRealPanelWidth() : this._getPanelSize(drawer.option('opened')));
        } else {
            overlay.option('width', overlay.option('container').width());
            overlay.option('height', calcFromRealPanelSize ? drawer.getRealPanelHeight() : this._getPanelSize(drawer.option('opened')));
        }
    }

    _setupContent($content, position) {
        $content.css('padding' + camelize(position, true), this.getDrawerInstance().option('minSize'));
        $content.css('transform', 'inherit');
    }

    _slidePositionRendering(config, _, animate) {
        const drawer = this.getDrawerInstance();

        this._initialPosition = drawer.isHorizontalDirection() ? { left: config.panelOffset } : { top: config.panelOffset };
        const position = drawer.calcTargetPosition();

        this._setupContent(config.$content, position, config.drawer);

        if(animate) {
            const animationConfig = extend(config.defaultAnimationConfig, {
                $element: config.$panel,
                position: config.panelOffset,
                duration: drawer.option('animationDuration'),
                direction: position,
            });

            animation.moveTo(animationConfig);
        } else {
            if(drawer.isHorizontalDirection()) {
                translator.move(config.$panel, { left: config.panelOffset });
            } else {
                translator.move(config.$panel, { top: config.panelOffset });
            }
        }
    }

    _expandPositionRendering(config, _, animate) {
        const drawer = this.getDrawerInstance();

        this._initialPosition = { left: 0 };
        const position = drawer.calcTargetPosition();

        this._setupContent(config.$content, position);

        translator.move(config.$panelOverlayContent, { left: 0 });

        if(animate) {
            const animationConfig = extend(config.defaultAnimationConfig, {
                $element: config.$panelOverlayContent,
                size: config.size,
                duration: drawer.option('animationDuration'),
                direction: position,
                marginTop: config.marginTop,
            });

            animation.size(animationConfig);
        } else {
            if(drawer.isHorizontalDirection()) {
                $(config.$panelOverlayContent).css('width', config.size);
            } else {
                $(config.$panelOverlayContent).css('height', config.size);

                if(position === 'bottom') {
                    $(config.$panelOverlayContent).css('marginTop', config.marginTop);
                }
            }
        }
    }

    _getPositionRenderingConfig(isDrawerOpened) {
        const drawer = this.getDrawerInstance();
        const config = super._getPositionRenderingConfig(isDrawerOpened);

        return extend(config, {
            panelOffset: this._getPanelOffset(isDrawerOpened) * this.getDrawerInstance()._getPositionCorrection(),
            $panelOverlayContent: drawer.getOverlay().$content(),
            marginTop: drawer.getRealPanelHeight() - config.size
        });
    }

    getPanelContent() {
        return $(this.getDrawerInstance().getOverlay().content());
    }

    isViewContentFirst(position) {
        return position === 'right' || position === 'bottom';
    }

    updateZIndex() {
        super.updateZIndex();

        if(!isDefined(this._panelZIndex)) {
            this._panelZIndex = zIndexPool.base() + 501;
            this._drawer._$panelContentWrapper.css('zIndex', this._panelZIndex);
        }

    }

    clearZIndex() {
        if(isDefined(this._panelZIndex)) {
            this._drawer._$panelContentWrapper.css('zIndex', '');
            delete this._panelZIndex;
        }

        super.clearZIndex();
    }
}

module.exports = OverlapStrategy;
