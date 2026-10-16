type Base64UrlValue = string

type PublicKeyCreationOptionsJson = {
    challenge: Base64UrlValue
    rp: PublicKeyCredentialRpEntity
    user: PublicKeyCredentialUserEntityJSON
    pubKeyCredParams: PublicKeyCredentialParameters[]
    timeout?: number
    excludeCredentials?: PublicKeyCredentialDescriptorJSON[]
    authenticatorSelection?: AuthenticatorSelectionCriteria
    attestation?: AttestationConveyancePreference
    extensions?: AuthenticationExtensionsClientInputs
}

type CredentialCreationOptionsJson = {
    publicKey: PublicKeyCreationOptionsJson
}

type PublicKeyRequestOptionsJson = {
    challenge: Base64UrlValue
    timeout?: number
    rpId?: string
    allowCredentials?: PublicKeyCredentialDescriptorJSON[]
    userVerification?: UserVerificationRequirement
    extensions?: AuthenticationExtensionsClientInputs
}

type CredentialRequestOptionsJson = {
    publicKey: PublicKeyRequestOptionsJson
}

type PublicKeyCredentialUserEntityJSON = Omit<PublicKeyCredentialUserEntity, 'id'> & {
    id: Base64UrlValue
}

type PublicKeyCredentialDescriptorJSON = Omit<PublicKeyCredentialDescriptor, 'id'> & {
    id: Base64UrlValue
}

type SerializedRegistrationCredential = {
    id: string
    rawId: string
    type: 'public-key'
    authenticatorAttachment?: AuthenticatorAttachment | null
    clientExtensionResults: AuthenticationExtensionsClientOutputs
    response: {
        clientDataJSON: string
        attestationObject: string
        transports?: string[]
    }
}

type SerializedAssertionCredential = {
    id: string
    rawId: string
    type: 'public-key'
    authenticatorAttachment?: AuthenticatorAttachment | null
    clientExtensionResults: AuthenticationExtensionsClientOutputs
    response: {
        clientDataJSON: string
        authenticatorData: string
        signature: string
        userHandle?: string
    }
}

const padBase64 = (value: string) => {
    const padLength = (4 - (value.length % 4)) % 4
    return value + '='.repeat(padLength)
}

const base64UrlToUint8Array = (value: string) => {
    const normalized = padBase64(value).replace(/-/g, '+').replace(/_/g, '/')
    const binary = window.atob(normalized)
    const bytes = new Uint8Array(binary.length)

    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
    }

    return bytes
}

const arrayBufferToBase64Url = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer)
    let binary = ''

    for (const byte of bytes) {
        binary += String.fromCharCode(byte)
    }

    return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

const normalizeCreationOptions = (
    optionsJson: PublicKeyCreationOptionsJson,
): PublicKeyCredentialCreationOptions => ({
    ...optionsJson,
    challenge: base64UrlToUint8Array(optionsJson.challenge),
    user: {
        ...optionsJson.user,
        id: base64UrlToUint8Array(optionsJson.user.id),
    },
    excludeCredentials: optionsJson.excludeCredentials?.map((credential) => ({
        ...credential,
        id: base64UrlToUint8Array(credential.id),
    })),
})

const normalizeRequestOptions = (
    optionsJson: PublicKeyRequestOptionsJson,
): PublicKeyCredentialRequestOptions => ({
    ...optionsJson,
    challenge: base64UrlToUint8Array(optionsJson.challenge),
    allowCredentials: optionsJson.allowCredentials?.map((credential) => ({
        ...credential,
        id: base64UrlToUint8Array(credential.id),
    })),
})

const serializeRegistrationCredential = (
    credential: PublicKeyCredential,
): SerializedRegistrationCredential => {
    const response = credential.response as AuthenticatorAttestationResponse
    const transports =
        typeof response.getTransports === 'function' ? response.getTransports() : undefined

    return {
        id: credential.id,
        rawId: arrayBufferToBase64Url(credential.rawId),
        type: 'public-key',
        authenticatorAttachment: credential.authenticatorAttachment as AuthenticatorAttachment | null | undefined,
        clientExtensionResults: credential.getClientExtensionResults(),
        response: {
            clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
            attestationObject: arrayBufferToBase64Url(response.attestationObject),
            transports: transports ? [...transports] : undefined,
        },
    }
}

const serializeAssertionCredential = (
    credential: PublicKeyCredential,
): SerializedAssertionCredential => {
    const response = credential.response as AuthenticatorAssertionResponse

    return {
        id: credential.id,
        rawId: arrayBufferToBase64Url(credential.rawId),
        type: 'public-key',
        authenticatorAttachment: credential.authenticatorAttachment as AuthenticatorAttachment | null | undefined,
        clientExtensionResults: credential.getClientExtensionResults(),
        response: {
            clientDataJSON: arrayBufferToBase64Url(response.clientDataJSON),
            authenticatorData: arrayBufferToBase64Url(response.authenticatorData),
            signature: arrayBufferToBase64Url(response.signature),
            userHandle: response.userHandle ? arrayBufferToBase64Url(response.userHandle) : undefined,
        },
    }
}

export const isPasskeySupported = () =>
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.credentials?.create

export async function createPasskeyCredential(optionsJson: PublicKeyCreationOptionsJson) {
    if (!isPasskeySupported()) {
        throw new Error('当前浏览器不支持 Passkey')
    }

    const normalizedOptions =
        'publicKey' in optionsJson
            ? normalizeCreationOptions((optionsJson as CredentialCreationOptionsJson).publicKey)
            : normalizeCreationOptions(optionsJson)

    const credential = await navigator.credentials.create({
        publicKey: normalizedOptions,
    })

    if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('浏览器未返回有效的 Passkey 凭证')
    }

    return JSON.stringify(serializeRegistrationCredential(credential))
}

export async function getPasskeyAssertion(optionsJson: PublicKeyRequestOptionsJson) {
    if (
        typeof window === 'undefined' ||
        typeof window.PublicKeyCredential === 'undefined' ||
        typeof navigator === 'undefined' ||
        !navigator.credentials?.get
    ) {
        throw new Error('当前浏览器不支持 Passkey')
    }

    const normalizedOptions =
        'publicKey' in optionsJson
            ? normalizeRequestOptions((optionsJson as CredentialRequestOptionsJson).publicKey)
            : normalizeRequestOptions(optionsJson)

    const credential = await navigator.credentials.get({
        publicKey: normalizedOptions,
    })

    if (!(credential instanceof PublicKeyCredential)) {
        throw new Error('浏览器未返回有效的 Passkey 登录凭证')
    }

    return JSON.stringify(serializeAssertionCredential(credential))
}
