/* eslint-disable @typescript-eslint/no-explicit-any */
import { PointerLockControls } from "@react-three/drei";
import { GunHand } from "./elements/GunHand";
import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Color, Quaternion, Vector3 } from "three";
import { MiniGameFloor } from "./elements/MiniGameFloor";
import { useRecoilState } from "recoil";
import {
  CurrentMapAtom,
  IsMiniGameClearedAtom,
  IsMiniGameStartedAtom,
} from "../../../../../../store/PlayersAtom";

const COOL_TIME = 2000;
let movement = { forward: false, backward: false, left: false, right: false };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MiniGame = () => {
  const [currentMap] = useRecoilState(CurrentMapAtom);
  const three = useThree();
  const spotLightRef = useRef(null);
  const ref = useRef(null);
  const [isMiniGameStarted, setIsMiniGameStarted] = useRecoilState(
    IsMiniGameStartedAtom
  );
  const [isMiniGameCleared, setIsMiniGameCleared] = useRecoilState(
    IsMiniGameClearedAtom
  );
  const [isBouncing, setIsBouncing] = useState(false);
  const [isShooting, setIsShooting] = useState(false);
  const gunHand = three.scene.getObjectByName("gunHand");

  useEffect(() => {
    three.scene.background = new Color(0x000000);
    return () => {
      three.scene.background = new Color(0xffffff);
      setIsMiniGameStarted(false);
      setIsMiniGameCleared(false);
    };
  }, [three.scene, currentMap, setIsMiniGameStarted, setIsMiniGameCleared]);

  useEffect(() => {
    if (isMiniGameStarted) {
      ref.current?.lock();
    }
  }, [isMiniGameStarted]);

  useEffect(() => {
    if (!spotLightRef.current) return;
    spotLightRef.current.lookAt(0, 0, 0);
  }, []);

  useEffect(() => {
    const isBouncingTimeout = setTimeout(() => {
      setIsBouncing(false);
    }, 100);

    const isShootingTimeout = setTimeout(() => {
      setIsShooting(false);
    }, COOL_TIME);
    return () => {
      clearTimeout(isBouncingTimeout);
      clearTimeout(isShootingTimeout);
    };
  }, [isBouncing]);

  useEffect(() => {
    const handlePointerDown = () => {
      if (
        !gunHand ||
        !isMiniGameStarted ||
        isMiniGameCleared ||
        isShooting ||
        isBouncing
      ) {
        return;
      }
      setIsBouncing(true);
      setIsShooting(true);
    };
    window.addEventListener("pointerdown", handlePointerDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [
    gunHand,
    isMiniGameCleared,
    isMiniGameStarted,
    isBouncing,
    isShooting,
    three.camera,
    three.controls,
    three.gl.domElement,
    three.scene,
  ]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      switch (e.key) {
        case "w":
          movement = { ...movement, forward: true };
          break;
        case "s":
          movement = { ...movement, backward: true };
          break;
        case "a":
          movement = { ...movement, left: true };
          break;
        case "d":
          movement = { ...movement, right: true };
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e) => {
      switch (e.key) {
        case "w":
          movement = { ...movement, forward: false };
          break;
        case "s":
          movement = { ...movement, backward: false };
          break;
        case "a":
          movement = { ...movement, left: false };
          break;
        case "d":
          movement = { ...movement, right: false };
          break;
        default:
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const directionVector = new Vector3();
  const cameraDirection = new Vector3();
  const worldUpVector = new Vector3(0, 1, 0);
  const perpendicularVector = new Vector3();
  const quaterinion = new Quaternion();

  useFrame(() => {
    if (!gunHand) return;
    if (!ref.current) return;
    ref.current.getDirection(directionVector);
    if (!isBouncing) {
      ref.current.camera.position.y = 1;
      const cameraPosition = three.camera.position;
      const gunPosition = cameraPosition
        .clone()
        .add(directionVector.clone().multiplyScalar(0.4));
      gunHand.position.set(gunPosition.x, gunPosition.y - 0.1, gunPosition.z);
      gunHand.lookAt(directionVector.clone().multiplyScalar(-10000));
    } else {
      ref.current.camera.getWorldDirection(cameraDirection);

      perpendicularVector
        .crossVectors(worldUpVector, cameraDirection)
        .multiplyScalar(-1)
        .normalize();

      quaterinion.setFromAxisAngle(perpendicularVector, 0.005);
      ref.current.camera.quaternion.premultiply(quaterinion);
      gunHand.quaternion.premultiply(
        quaterinion.clone().setFromAxisAngle(perpendicularVector, 0.1)
      );
    }

    if (movement.forward) {
      three.camera.position.add(
        new Vector3(directionVector.x, 0, directionVector.z).multiplyScalar(
          0.02
        )
      );
    }
    if (movement.backward) {
      three.camera.position.add(
        new Vector3(directionVector.x, 0, directionVector.z).multiplyScalar(
          -0.02
        )
      );
    }
    if (movement.left) {
      ref.current.camera.getWorldDirection(cameraDirection);

      perpendicularVector
        .crossVectors(worldUpVector, cameraDirection)
        .multiplyScalar(-1)
        .normalize();

      three.camera.position.add(
        new Vector3(
          perpendicularVector.x,
          0,
          perpendicularVector.z
        ).multiplyScalar(-0.02)
      );
    }
    if (movement.right) {
      ref.current.camera.getWorldDirection(cameraDirection);

      perpendicularVector
        .crossVectors(worldUpVector, cameraDirection)
        .multiplyScalar(-1)
        .normalize();

      three.camera.position.add(
        new Vector3(
          perpendicularVector.x,
          0,
          perpendicularVector.z
        ).multiplyScalar(0.02)
      );
    }
  });

  return (
    <>
      <PointerLockControls
        maxPolarAngle={Math.PI / 1.5}
        minPolarAngle={Math.PI / 2.5}
        ref={ref}
      />
      <MiniGameFloor />
      <spotLight ref={spotLightRef} intensity={200} position={[0, 20, 0]} />
      {gunHand && (
        <directionalLight
          intensity={1}
          position={[
            gunHand.position.x,
            gunHand.position.y + 0.5,
            gunHand.position.z,
          ]}
        />
      )}
      <GunHand />
    </>
  );
  3;
};