import React, {
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import styled, { ThemeContext } from 'styled-components';

import { defaultProps } from '../../default-props';

import { Box } from '../Box';
import { Button } from '../Button';
import { DropButton } from '../DropButton';
import { Keyboard } from '../Keyboard';
import { Text } from '../Text';
import { normalizeColor } from '../../utils';
import { MessageContext } from '../../contexts/MessageContext';

const ContainerBox = styled(Box)`
  max-height: inherit;

  /* IE11 hack to get drop contents to not overflow */
  @media screen and (-ms-high-contrast: active), (-ms-high-contrast: none) {
    width: 100%;
  }

  ${(props) => props.theme.menu.extend};
`;

/* Notes on keyboard interactivity (based on W3) // For details reference: https://www.w3.org/TR/wai-aria-practices/#menu

To open menu when menu button is focused:
- Space/Enter/Up arrow/Down arrow will open menu

To navigate within menu:
- Up/down arrow keys can be used and will loop through options
(keeping focus within the Menu)
- Tab can be used, but once the last menu item is reached, Tab will close the
Menu and continue through page content.

To close the menu:
- Tabbing beyond the first or last menu item.
- Esc will close the menu
- Select a menu item

To make a selection:
- Enter key is pressed.
- Space is pressed.
*/

const Menu = forwardRef((props, ref) => {
  const {
    a11yTitle,
    'aria-label': ariaLabel,
    children,
    disabled,
    dropAlign,
    dropBackground,
    dropProps,
    dropTarget,
    justifyContent,
    icon,
    items,
    label,
    messages,
    onKeyDown,
    open,
    plain,
    size,
    ...rest
  } = props;
  const theme = useContext(ThemeContext) || defaultProps.theme;
  const { format } = useContext(MessageContext);
  const iconColor = normalizeColor(theme.menu.icons.color || 'control', theme);
  // need to destructure the align otherwise it will get passed through
  // to DropButton and override prop values
  const { align: themeDropAlign, ...themeDropProps } = theme.menu.drop;

  const align = (dropProps && dropProps.align) || dropAlign || themeDropAlign;
  const controlButtonIndex = useMemo(() => {
    if (align.top === 'top') return -1;
    if (align.bottom === 'bottom') return items.length;
    return undefined;
  }, [align, items]);

  // Keeps track of whether menu options should be mirrored
  // when there's not enough space below DropButton. This state
  // is modified on /Drop/DropContainer.js.
  const [alignControlMirror, setAlignControlMirror] = useState();

  const buttonRefs = {};
  const constants = useMemo(
    () => ({
      none: 'none',
      tab: 9,
      // Menu control button included on top of menu items
      controlTop: align.top === 'top' || undefined,
      // Menu control button included on the bottom of menu items
      controlBottom: align.bottom === 'bottom' || undefined,
      controlButtonIndex,
    }),
    [align, controlButtonIndex],
  );

  const [activeItemIndex, setActiveItemIndex] = useState(constants.none);
  const [isOpen, setOpen] = useState(open || false);

  const MenuIcon =
    isOpen && theme.menu.icons.up ? theme.menu.icons.up : theme.menu.icons.down;

  const onDropClose = useCallback(() => {
    setActiveItemIndex(constants.none);
    setOpen(false);
  }, [constants.none]);

  const onDropOpen = useCallback(() => {
    setOpen(true);
  }, []);

  const onSelectMenuItem = (event) => {
    if (isOpen) {
      if (activeItemIndex >= 0) {
        event.preventDefault();
        event.stopPropagation();
        buttonRefs[activeItemIndex].click();
      }
    } else {
      onDropOpen();
    }
  };

  const isTab = (event) =>
    event.keyCode === constants.tab || event.which === constants.tab;

  const onNextMenuItem = (event) => {
    event.preventDefault();
    if (!isOpen) {
      onDropOpen();
    } else if (
      isTab(event) &&
      ((!constants.controlBottom && activeItemIndex === items.length - 1) ||
        (constants.controlBottom && activeItemIndex === controlButtonIndex))
    ) {
      // User has reached end of the menu, this tab will close
      // the menu drop because there are no more "next items" to access
      onDropClose();
    } else {
      let index;
      if (
        // This checks if the user has reached the end of the menu.
        // In the case the the menu control button is located at the
        // bottom of the menu, it checks if the user has reached the button.
        // Otherwise, it checks if the user is at the last menu item.
        (constants.controlBottom && activeItemIndex === controlButtonIndex) ||
        (!constants.controlBottom && activeItemIndex === items.length - 1) ||
        activeItemIndex === constants.none
      ) {
        // place focus on the first menu item
        index = 0;
      } else {
        index = activeItemIndex + 1;
      }
      setActiveItemIndex(index);
      buttonRefs[index].focus();
    }
  };

  const onPreviousMenuItem = (event) => {
    event.preventDefault();
    if (!isOpen) {
      onDropOpen();
    } else if (
      isTab(event) &&
      ((constants.controlTop && activeItemIndex === controlButtonIndex) ||
        (!constants.controlTop && activeItemIndex - 1 < 0))
    ) {
      // User has reached beginning of the menu, this tab will close
      // the menu drop because there are no more "previous items" to access
      onDropClose();
    } else {
      let index;
      if (activeItemIndex - 1 < 0) {
        if (
          constants.controlTop &&
          activeItemIndex - 1 === controlButtonIndex
        ) {
          index = items.length;
        } else {
          index = items.length - 1;
        }
      } else {
        index = activeItemIndex - 1;
      }
      setActiveItemIndex(index);
      buttonRefs[index].focus();
    }
  };

  const menuIcon =
    icon !== false
      ? (icon !== true && icon) || <MenuIcon color={iconColor} size={size} />
      : null;

  let buttonProps = { plain, size };
  let content;
  if (children) {
    content = children;
  } else if (!theme.button.default) {
    content = (
      <Box
        direction="row"
        justify={justifyContent}
        align="center"
        pad="small"
        gap={label && icon !== false ? 'small' : undefined}
      >
        <Text size={size}>{label}</Text>
        {menuIcon}
      </Box>
    );
  } else {
    // when a theme has theme.button.default, keep content as
    // undefined so we can rely on Button label & icon props
    buttonProps = {
      icon: menuIcon,
      label,
      plain,
      reverse: true,
      size,
    };
    content = undefined;
  }

  const controlMirror = (
    <Box flex={false}>
      <Button
        ref={(r) => {
          // make it accessible at the end of all menu items
          buttonRefs[items.length] = r;
        }}
        a11yTitle={
          ariaLabel || a11yTitle || format({ id: 'menu.closeMenu', messages })
        }
        active={activeItemIndex === controlButtonIndex}
        focusIndicator={false}
        hoverIndicator="background"
        onClick={onDropClose}
        onFocus={() => setActiveItemIndex(controlButtonIndex)}
        // On first tab into menu, the control button should not
        // be able to receive tab focus because the focus should
        // go to the first menu item instead.
        tabIndex={activeItemIndex === constants.none ? '-1' : undefined}
        {...buttonProps}
      >
        {typeof content === 'function'
          ? () => content({ ...props, drop: true })
          : content}
      </Button>
    </Box>
  );

  return (
    <Keyboard
      onDown={onNextMenuItem}
      onUp={onPreviousMenuItem}
      onEnter={onSelectMenuItem}
      onSpace={onSelectMenuItem}
      onEsc={onDropClose}
      onTab={onDropClose}
      onKeyDown={onKeyDown}
    >
      <DropButton
        ref={ref}
        {...rest}
        {...buttonProps}
        a11yTitle={
          ariaLabel || a11yTitle || format({ id: 'menu.openMenu', messages })
        }
        onAlign={setAlignControlMirror}
        disabled={disabled}
        dropAlign={align}
        dropTarget={dropTarget}
        dropProps={dropProps || themeDropProps}
        open={isOpen}
        onOpen={onDropOpen}
        onClose={onDropClose}
        dropContent={
          <Keyboard
            onTab={(event) =>
              event.shiftKey ? onPreviousMenuItem(event) : onNextMenuItem(event)
            }
            onEnter={onSelectMenuItem}
          >
            <ContainerBox background={dropBackground || theme.menu.background}>
              {alignControlMirror === 'top' && align.top === 'top'
                ? controlMirror
                : undefined}
              <Box overflow="auto">
                {items.map((item, index) => {
                  // Determine whether the label is done as a child or
                  // as an option Button kind property.
                  const child = !theme.button.option ? (
                    <Box
                      align="start"
                      pad="small"
                      direction="row"
                      gap={item.gap}
                    >
                      {item.reverse && item.label}
                      {item.icon}
                      {!item.reverse && item.label}
                    </Box>
                  ) : undefined;
                  // if we have a child, turn on plain, and hoverIndicator

                  return (
                    // eslint-disable-next-line react/no-array-index-key
                    <Box key={index} flex={false}>
                      <Button
                        ref={(r) => {
                          buttonRefs[index] = r;
                        }}
                        onFocus={() => setActiveItemIndex(index)}
                        active={activeItemIndex === index}
                        focusIndicator={false}
                        plain={!child ? undefined : true}
                        align="start"
                        kind={!child ? 'option' : undefined}
                        hoverIndicator={!child ? undefined : 'background'}
                        {...(!child
                          ? item
                          : {
                              ...item,
                              gap: undefined,
                              icon: undefined,
                              label: undefined,
                              reverse: undefined,
                            })}
                        onClick={(...args) => {
                          if (item.onClick) {
                            item.onClick(...args);
                          }
                          if (item.close !== false) {
                            onDropClose();
                          }
                        }}
                      >
                        {child}
                      </Button>
                    </Box>
                  );
                })}
              </Box>
              {alignControlMirror === 'bottom' || align.bottom === 'bottom'
                ? controlMirror
                : undefined}
            </ContainerBox>
          </Keyboard>
        }
      >
        {content}
      </DropButton>
    </Keyboard>
  );
});

Menu.defaultProps = {
  items: [],
  messages: undefined,
  justifyContent: 'start',
};

Menu.displayName = 'Menu';

let MenuDoc;
if (process.env.NODE_ENV !== 'production') {
  MenuDoc = require('./doc').doc(Menu); // eslint-disable-line global-require
}
const MenuWrapper = MenuDoc || Menu;

export { MenuWrapper as Menu };
