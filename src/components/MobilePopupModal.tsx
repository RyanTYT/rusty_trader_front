import { useEffect, useState, useRef, ReactNode } from "react";
import { Modal, Box, Fade } from "@mui/material";
import { useSpring, animated } from "@react-spring/web";
import { useDrag } from "@use-gesture/react";

const AnimatedBox = animated(Box);

const BottomSheetModal = ({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) => {
  const [isVisible, setIsVisible] = useState(open);
  const modal = useRef(null as unknown as HTMLElement);

  // Spring for the Y position
  const [{ y }, api] = useSpring(() => ({
    y: open ? 0 : 500,
    config: { tension: 300, friction: 30 },
  }));

  // Handle open/close animations
  useEffect(() => {
    if (open) {
      setIsVisible(true);
      api.start({
        y: 0,
      });
    } else if (isVisible) {
      const height = modal.current?.clientHeight || 500;
      api.start({
        y: height,
        onRest: () => {
          setIsVisible(false);
        },
      });
    }
  }, [open, api]);

  const closeWithAnimation = () => {
    const height = modal.current?.clientHeight || 500;
    api.start({
      y: height,
      onRest: () => {
        setIsVisible(false);
        onClose();
      },
    });
  };

  const bind = useDrag(
    ({ down, movement: [, my], velocity, direction: [, dy] }) => {
      if (my < 0) return; // prevent dragging up
      
      if (!down) {
        if (my > 100 || (velocity[1] > 0.5 && dy > 0)) {
          // dismiss on big enough drag or fast flick down
          closeWithAnimation();
        } else {
          api.start({ y: 0 });
        }
      } else {
        api.start({ y: my, immediate: true });
      }
    },
    { axis: "y", filterTaps: true },
  );

  return (
    <Modal
      open={open || isVisible}
      onClose={closeWithAnimation}  // Use the animation function
      closeAfterTransition
      slotProps={{
        backdrop: { timeout: 500 },  // Give the backdrop a timeout
      }}
    >
      <Fade in={open} timeout={open ? 300 : 500}>
        <Box
          ref={modal}
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          <AnimatedBox
            {...bind()}
            style={{ y, display: isVisible ? 'block' : 'none' }}
            sx={{
              bgcolor: "background.paper",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              boxShadow: 24,
              maxHeight: "90vh",
              overflowY: "auto",
              p: 2,
              width: "100%",
              height: "auto",
              touchAction: "none",
              pointerEvents: "auto",
            }}
          >
            {/* Drag Handle */}
            <Box
              sx={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "#ccc",
                mx: "auto",
                mb: 1,
              }}
            />
            {/* Modal content */}
            {children}
          </AnimatedBox>
        </Box>
      </Fade>
    </Modal>
  );
};

export default BottomSheetModal;
