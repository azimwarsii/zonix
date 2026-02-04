import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Camera, useCameraDevice, useFrameProcessor } from 'react-native-vision-camera';
import { useFaceDetector, type FrameFaceDetectionOptions } from 'react-native-vision-camera-face-detector';
import { Worklets } from 'react-native-worklets-core';

const { width, height } = Dimensions.get('window');

interface Props {
    onCapture: (path: string) => void;
    onClose: () => void;
}

export default function FaceDetectorCamera({ onCapture, onClose }: Props) {
    const device = useCameraDevice('front');
    const camera = useRef<Camera>(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [livenessVerified, setLivenessVerified] = useState(false);
    const [hasPermission, setHasPermission] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [instruction, setInstruction] = useState('Align your face');

    const blinkRef = useRef({ hasOpened: false, hasClosed: false });

    useEffect(() => {
        (async () => {
            const status = await Camera.requestCameraPermission();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const faceDetectorOptions = React.useMemo<FrameFaceDetectionOptions>(() => ({
        performanceMode: 'accurate',
        classificationMode: 'all',
    }), []);

    const { detectFaces } = useFaceDetector(faceDetectorOptions);

    const updateLivenessUI = Worklets.createRunOnJS((detected: boolean, verified: boolean, msg: string) => {
        setFaceDetected(detected);
        setLivenessVerified(verified);
        setInstruction(msg);
    });

    const frameProcessor = useFrameProcessor((frame) => {
        'worklet';
        const faces = detectFaces(frame);

        if (faces.length > 0) {
            const face = faces[0];
            const leftEye = face.leftEyeOpenProbability ?? 0;
            const rightEye = face.rightEyeOpenProbability ?? 0;

            // Liveness Logic: Blink Detection
            // 1. Must see eyes open
            // 2. Must see eyes closed (blink)
            // 3. Must see eyes open again

            if (livenessVerified) {
                updateLivenessUI(true, true, 'Ready to capture');
            } else {
                if (!blinkRef.current.hasOpened && leftEye > 0.7 && rightEye > 0.7) {
                    blinkRef.current.hasOpened = true;
                }

                if (blinkRef.current.hasOpened && !blinkRef.current.hasClosed && leftEye < 0.2 && rightEye < 0.2) {
                    blinkRef.current.hasClosed = true;
                }

                if (blinkRef.current.hasClosed && leftEye > 0.7 && rightEye > 0.7) {
                    updateLivenessUI(true, true, 'Verified! Tap to capture');
                } else {
                    updateLivenessUI(true, false, blinkRef.current.hasOpened ? 'Now blink your eyes' : 'Looking for eyes...');
                }
            }
        } else {
            blinkRef.current.hasOpened = false;
            blinkRef.current.hasClosed = false;
            updateLivenessUI(false, false, 'Align your face');
        }
    }, [detectFaces, livenessVerified]);

    const takePhoto = async () => {
        if (!camera.current || !livenessVerified || isCapturing) return;

        try {
            setIsCapturing(true);
            const photo = await camera.current.takePhoto({
                flash: 'off',
                enableShutterSound: true,
            });
            onCapture(photo.path);
        } catch (e) {
            console.error('Failed to take photo:', e);
        } finally {
            setIsCapturing(false);
        }
    };

    if (!hasPermission) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No access to camera</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    }

    if (!device) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>No front camera device found</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Camera
                ref={camera}
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={true}
                photo={true}
                frameProcessor={frameProcessor}
            />

            {/* Overlay */}
            <View style={styles.overlay}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={30} color="#fff" />
                </TouchableOpacity>

                <View style={styles.guideContainer}>
                    <View style={[
                        styles.faceGuide,
                        faceDetected && styles.faceDetectedGuide,
                        livenessVerified && styles.faceVerifiedGuide
                    ]} />
                    <Text style={[
                        styles.statusText,
                        faceDetected && styles.faceDetectedText,
                        livenessVerified && styles.faceVerifiedText
                    ]}>
                        {instruction}
                    </Text>
                </View>

                <View style={styles.bottomControls}>
                    <TouchableOpacity
                        onPress={takePhoto}
                        disabled={!livenessVerified || isCapturing}
                        style={[styles.captureButton, (!livenessVerified || isCapturing) && styles.disabledButton]}
                    >
                        <LinearGradient
                            colors={livenessVerified ? ['#aa48b7', '#4a148c'] : ['#333', '#222']}
                            style={styles.gradient}
                        >
                            <View style={styles.innerCircle} />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    overlay: {
        flex: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    closeButton: {
        alignSelf: 'flex-end',
        marginTop: 40,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    guideContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    faceGuide: {
        width: width * 0.7,
        height: width * 0.9,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        borderRadius: 150,
        borderStyle: 'dashed',
    },
    faceDetectedGuide: {
        borderColor: '#aa48b7',
        borderStyle: 'solid',
        borderWidth: 3,
    },
    statusText: {
        color: '#fff',
        fontSize: 18,
        marginTop: 20,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: -1, height: 1 },
        textShadowRadius: 10,
    },
    faceDetectedText: {
        color: '#aa48b7',
    },
    faceVerifiedGuide: {
        borderColor: '#4CAF50',
        borderStyle: 'solid',
        borderWidth: 3,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
    },
    faceVerifiedText: {
        color: '#4CAF50',
    },
    bottomControls: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    disabledButton: {
        opacity: 0.5,
    },
    gradient: {
        flex: 1,
        borderRadius: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#fff',
    },
    text: {
        color: '#fff',
        textAlign: 'center',
        marginTop: height / 2,
    },
});
