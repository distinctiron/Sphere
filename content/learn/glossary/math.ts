import type { GlossaryTerm } from "./types";

/** Glossary terms defined in the math path (ids are global; see index.ts) */
export const MATH_TERMS: GlossaryTerm[] = [
  {
    id: "activation-function",
    term: "Activation function",
    definition:
      "The non-linear function a neuron applies to its weighted sum, such as ReLU, sigmoid or GELU. It bends the space so that stacked layers can represent more than a single linear map.",
    lesson: "neuron",
  },
  {
    id: "relu",
    term: "ReLU",
    aliases: ["rectified linear unit"],
    definition: "The activation max(0, z): it passes positive values through and sets negative values to zero, folding space along one hyperplane per neuron.",
    lesson: "neuron",
  },
  {
    id: "logits",
    term: "Logits",
    definition: "The raw, unnormalised scores a model outputs for each possible answer, before softmax turns them into probabilities.",
    lesson: "probability",
  },
  {
    id: "forward-pass",
    term: "Forward pass",
    definition:
      "Running an input through a network layer by layer to produce an output. For each layer, multiply by the weight matrix, add the bias, apply the activation. It costs about two operations per parameter per input.",
    lesson: "forward-pass",
  },
  {
    id: "hidden-layer",
    term: "Hidden layer",
    definition:
      "Any layer between a network's input and its output. Its outputs are a learned set of coordinates for the input, with one coordinate per neuron.",
    lesson: "forward-pass",
  },
  {
    id: "linear-separability",
    term: "Linear separability",
    aliases: ["linearly separable"],
    definition: "A set of labelled points is linearly separable if a single straight line (a hyperplane, in higher dimensions) puts every class on its own side.",
    lesson: "forward-pass",
  },
  {
    id: "mlp",
    term: "MLP",
    aliases: ["multilayer perceptron", "feed-forward network"],
    definition:
      "A network made of stacked fully connected layers, each a matrix multiply plus bias followed by an activation. Transformers contain an MLP block in every layer.",
    lesson: "forward-pass",
  },
  {
    id: "universal-approximation",
    term: "Universal approximation",
    definition:
      "The result that a network with at least one hidden layer and enough neurons can approximate any continuous function on a bounded region as closely as desired. It says nothing about how many neurons that takes or how to find the weights.",
    lesson: "forward-pass",
  },

  // ---- A1 vectors ----
  {
    id: "vector",
    term: "Vector",
    definition:
      "An ordered list of numbers, read as a point or an arrow in a space with one axis per number. Models represent words, images and hidden states as vectors with hundreds to thousands of dimensions.",
    lesson: "vectors",
  },
  {
    id: "dot-product",
    term: "Dot product",
    aliases: ["inner product"],
    definition:
      "Multiply two vectors coordinate by coordinate and add the results. It equals the product of their lengths times the cosine of the angle between them, so it measures how much they point the same way.",
    lesson: "vectors",
  },
  {
    id: "cosine-similarity",
    term: "Cosine similarity",
    definition:
      "The cosine of the angle between two vectors: their dot product divided by both lengths. It is 1 for the same direction, 0 for perpendicular and -1 for opposite, whatever the vectors' lengths.",
    lesson: "vectors",
  },
  {
    id: "vector-norm",
    term: "Norm",
    aliases: ["vector length", "magnitude"],
    definition:
      "The length of a vector: the square root of the sum of its squared coordinates (the Euclidean or L2 norm). A unit vector has norm 1.",
    lesson: "vectors",
  },
  {
    id: "orthogonal",
    term: "Orthogonal",
    aliases: ["orthogonality", "perpendicular"],
    definition:
      "Two vectors are orthogonal when their dot product is zero: they are at right angles and share no component. In high dimensions, random directions are almost always nearly orthogonal.",
    lesson: "vectors",
  },
  {
    id: "dimension",
    term: "Dimension",
    aliases: ["dimensionality"],
    definition:
      "The number of coordinates in a vector, equal to the number of independent axes of the space it lives in. More dimensions give more room for independent distinctions.",
    lesson: "vectors",
  },

  // ---- A2 matrices ----
  {
    id: "matrix",
    term: "Matrix",
    definition:
      "A rectangular grid of numbers. Multiplying a vector by an m×n matrix maps it from an n-dimensional space to an m-dimensional one, so a matrix is a transformation of a whole space.",
    lesson: "matrices",
  },
  {
    id: "linear-transformation",
    term: "Linear transformation",
    aliases: ["linear map"],
    definition:
      "A transformation that keeps the origin fixed, keeps straight lines straight and keeps evenly spaced grid lines evenly spaced. Every linear transformation can be written as a matrix, and every matrix is one.",
    lesson: "matrices",
  },
  {
    id: "basis-vectors",
    term: "Basis vectors",
    aliases: ["basis"],
    definition:
      "The unit vectors along each axis, such as (1, 0) and (0, 1) in the plane. The columns of a matrix are exactly where it sends these vectors, which fixes where everything else goes.",
    lesson: "matrices",
  },
  {
    id: "matrix-multiplication",
    term: "Matrix multiplication",
    aliases: ["matmul", "matrix-vector product"],
    definition:
      "Combining matrices so that the product AB applies B first, then A. Each entry of the result is the dot product of a row of A with a column of B. It is the core operation of neural networks.",
    lesson: "matrices",
  },
  {
    id: "rank",
    term: "Rank",
    definition:
      "The number of independent directions a matrix's output can span: the dimension of the space it maps onto. A matrix with rank below its input dimension flattens some directions to zero and loses information.",
    lesson: "matrices",
  },
  {
    id: "projection",
    term: "Projection",
    definition:
      "A linear transformation that flattens space onto a lower-dimensional subspace, like casting a shadow. Components along the flattened directions are discarded and cannot be recovered.",
    lesson: "matrices",
  },

  // ---- A3 derivatives ----
  {
    id: "derivative",
    term: "Derivative",
    definition:
      "The local sensitivity of an output to its input: how much the output changes per small nudge of the input. Geometrically, the slope of the tangent line at a point.",
    lesson: "derivatives",
  },
  {
    id: "partial-derivative",
    term: "Partial derivative",
    definition:
      "The derivative of a function of several inputs with respect to one of them, holding the others fixed: the slope along one axis of the landscape.",
    lesson: "derivatives",
  },
  {
    id: "gradient",
    term: "Gradient",
    definition:
      "The vector of all partial derivatives of a function. It points in the direction of steepest ascent, its length is the steepness in that direction, and it is perpendicular to the contour lines.",
    lesson: "derivatives",
  },
  {
    id: "chain-rule",
    term: "Chain rule",
    definition:
      "The rule that sensitivities multiply along a chain of functions: if y depends on x and z depends on y, then dz/dx = dz/dy × dy/dx. It is the principle behind backpropagation.",
    lesson: "derivatives",
  },
  {
    id: "local-linearity",
    term: "Local linearity",
    aliases: ["linear approximation"],
    definition:
      "The fact that a smooth function looks like a straight line (or flat plane) when you zoom in far enough. The derivative or gradient describes that line or plane, so it predicts the effect of small changes only.",
    lesson: "derivatives",
  },

  // ---- A4 probability ----
  {
    id: "probability-distribution",
    term: "Probability distribution",
    definition:
      "An assignment of a non-negative probability to every possible outcome, summing to 1. A language model outputs one over its whole vocabulary for every next token.",
    lesson: "probability",
  },
  {
    id: "softmax",
    term: "Softmax",
    definition:
      "The function that turns a vector of logits into a probability distribution: exponentiate each score and divide by the total. Adding the same number to every logit changes nothing; only the differences matter.",
    lesson: "probability",
  },
  {
    id: "log-likelihood",
    term: "Log-likelihood",
    aliases: ["log probability", "log-prob"],
    definition:
      "The logarithm of the probability a model assigned to what actually happened. Summing log-probabilities over many outcomes scores a model on data; higher (closer to zero) is better.",
    lesson: "probability",
  },
  {
    id: "cross-entropy",
    term: "Cross-entropy",
    aliases: ["cross-entropy loss", "negative log-likelihood"],
    definition:
      "The average surprise, minus the log-probability, that a model's predictions assign to the true outcomes. It is the standard loss for classifiers and language models, and it is minimised when the predicted distribution matches the true one.",
    lesson: "probability",
  },
  {
    id: "entropy",
    term: "Entropy",
    definition:
      "The average surprise of a distribution about its own outcomes: zero when one outcome is certain, largest when all are equally likely. It measures how uncertain the distribution is.",
    lesson: "probability",
  },

  // ---- A5 neuron ----
  {
    id: "neuron",
    term: "Neuron",
    aliases: ["artificial neuron", "unit"],
    definition:
      "The basic unit of a neural network: a weighted sum of its inputs plus a bias, passed through an activation function. Geometrically, it measures how far an input lies along one direction, past a threshold.",
    lesson: "neuron",
  },
  {
    id: "weights",
    term: "Weights",
    aliases: ["weight"],
    definition:
      "The learned numbers that multiply a neuron's inputs. Together they form a weight vector: the direction in input space the neuron responds to most strongly.",
    lesson: "neuron",
  },
  {
    id: "bias",
    term: "Bias",
    definition:
      "The learned number a neuron adds to its weighted sum. It shifts the neuron's threshold, moving its decision boundary away from the origin without turning it.",
    lesson: "neuron",
  },
  {
    id: "parameters",
    term: "Parameters",
    aliases: ["parameter", "parameter count"],
    definition:
      "All the numbers a model learns during training, mainly the weights and biases of its layers. A 70-billion-parameter model has 70 billion of them.",
    lesson: "neuron",
  },
  {
    id: "decision-boundary",
    term: "Decision boundary",
    aliases: ["hyperplane"],
    definition:
      "The set of inputs where a neuron's weighted sum plus bias is exactly zero. For one neuron it is a straight line in 2-D, a plane in 3-D and a hyperplane in general, perpendicular to the weight vector.",
    lesson: "neuron",
  },
  {
    id: "sigmoid",
    term: "Sigmoid",
    aliases: ["logistic function"],
    definition:
      "The S-shaped activation 1 / (1 + e^(-z)), which squashes any number into the range 0 to 1. It turns a single score into a probability and is the two-class case of softmax.",
    lesson: "neuron",
  },

  // ---- A7 gradient descent ----
  {
    id: "loss-function",
    term: "Loss function",
    aliases: ["loss", "objective"],
    definition:
      "A single number that measures how wrong a model is on some data, such as the average cross-entropy. Training means adjusting the parameters to make it smaller.",
    lesson: "gradient-descent",
  },
  {
    id: "loss-landscape",
    term: "Loss landscape",
    definition:
      "The picture of the loss as a height above the space of all parameter settings. Each point is one complete setting of the model; training is a walk downhill across it.",
    lesson: "gradient-descent",
  },
  {
    id: "gradient-descent",
    term: "Gradient descent",
    definition:
      "The training algorithm that repeatedly nudges every parameter a small step against the gradient of the loss, the locally steepest downhill direction.",
    lesson: "gradient-descent",
  },
  {
    id: "learning-rate",
    term: "Learning rate",
    aliases: ["step size"],
    definition:
      "The number that scales each gradient step. Too small and training crawls; too large and steps overshoot the valley, bounce or diverge.",
    lesson: "gradient-descent",
  },
  {
    id: "sgd",
    term: "SGD",
    aliases: ["stochastic gradient descent"],
    definition:
      "Gradient descent that estimates the gradient from a small random mini-batch of examples at each step instead of the whole dataset. The estimate is noisy but cheap, and on average points the right way.",
    lesson: "gradient-descent",
  },
  {
    id: "mini-batch",
    term: "Mini-batch",
    aliases: ["batch size"],
    definition:
      "The small random subset of training examples used to estimate the gradient for one step. Larger batches give less noisy estimates at a higher cost per step.",
    lesson: "gradient-descent",
  },
  {
    id: "momentum",
    term: "Momentum",
    definition:
      "An optimiser technique that steps along a running average of recent gradients rather than the latest one. Consistent directions build up speed, while back-and-forth zigzags cancel out.",
    lesson: "gradient-descent",
  },
  {
    id: "adam",
    term: "Adam",
    aliases: ["AdamW"],
    definition:
      "The most widely used optimiser for large networks. It combines momentum with a per-parameter step size that shrinks for parameters whose gradients are consistently large and grows for those whose gradients are small.",
    lesson: "gradient-descent",
  },
  {
    id: "saddle-point",
    term: "Saddle point",
    definition:
      "A flat point of the landscape that curves up along some directions and down along others. In very high dimensions, flat points at high loss are thought to be mostly saddles rather than true local minima (a well-supported heuristic, not a theorem).",
    lesson: "gradient-descent",
  },

  // ---- A8 backpropagation ----
  {
    id: "backpropagation",
    term: "Backpropagation",
    aliases: ["backprop", "backward pass"],
    definition:
      "The algorithm that computes the gradient of the loss with respect to every parameter by applying the chain rule backwards through the network, reusing each layer's results. It costs about twice the forward pass.",
    lesson: "backpropagation",
  },
  {
    id: "computational-graph",
    term: "Computational graph",
    definition:
      "The network of simple operations that turns inputs and parameters into the loss. Backpropagation walks this graph in reverse, passing sensitivities along each edge.",
    lesson: "backpropagation",
  },
  {
    id: "autodiff",
    term: "Automatic differentiation",
    aliases: ["autodiff", "autograd"],
    definition:
      "Software that records the operations of a computation and derives its exact gradient mechanically. Reverse-mode autodiff is backpropagation, and frameworks like PyTorch and JAX do it for you.",
    lesson: "backpropagation",
  },
  {
    id: "vanishing-gradients",
    term: "Vanishing gradients",
    aliases: ["vanishing gradient"],
    definition:
      "Gradients that shrink towards zero as they flow back through many layers, because each layer multiplies them by a factor below one. Early layers then barely learn.",
    lesson: "backpropagation",
  },
  {
    id: "exploding-gradients",
    term: "Exploding gradients",
    aliases: ["exploding gradient"],
    definition:
      "Gradients that grow out of control as they flow back through many layers, because each layer multiplies them by a factor above one. Steps become huge and training diverges.",
    lesson: "backpropagation",
  },
  {
    id: "gradient-clipping",
    term: "Gradient clipping",
    definition:
      "Capping the length of the gradient vector before each step, so that a rare huge gradient cannot throw the parameters far across the landscape.",
    lesson: "backpropagation",
  },

  // ---- A9 training in practice ----
  {
    id: "generalisation",
    term: "Generalisation",
    aliases: ["generalization"],
    definition:
      "How well a model performs on data it was not trained on. It is the real goal of training; low loss on the training data alone proves little.",
    lesson: "training-in-practice",
  },
  {
    id: "overfitting",
    term: "Overfitting",
    definition:
      "Fitting the training data so closely, including its noise and quirks, that performance on new data gets worse. Training loss keeps falling while validation loss rises.",
    lesson: "training-in-practice",
  },
  {
    id: "underfitting",
    term: "Underfitting",
    definition:
      "When a model is too simple or trained too little to capture the real pattern, so it does poorly on training and new data alike.",
    lesson: "training-in-practice",
  },
  {
    id: "validation-set",
    term: "Validation set",
    aliases: ["held-out set", "dev set"],
    definition:
      "Data held back from training and used to measure generalisation while making choices such as when to stop and which settings to use.",
    lesson: "training-in-practice",
  },
  {
    id: "test-set",
    term: "Test set",
    definition:
      "Data kept aside until all choices are made and used once for a final, unbiased estimate of performance. Tuning on it turns it into a second validation set.",
    lesson: "training-in-practice",
  },
  {
    id: "regularisation",
    term: "Regularisation",
    aliases: ["regularization"],
    definition:
      "Any technique that discourages a model from fitting noise, such as penalising large weights, randomly dropping units or stopping early, usually trading a little training loss for better generalisation.",
    lesson: "training-in-practice",
  },
  {
    id: "weight-decay",
    term: "Weight decay",
    definition:
      "A regularisation that shrinks every weight slightly towards zero at each step. For plain gradient descent this is equivalent to adding a penalty on the squared size of the weights. It favours smoother, simpler functions.",
    lesson: "training-in-practice",
  },
  {
    id: "dropout",
    term: "Dropout",
    definition:
      "A regularisation that randomly switches off a fraction of neurons at each training step, so the network cannot rely on any single unit and must spread what it learns.",
    lesson: "training-in-practice",
  },
  {
    id: "early-stopping",
    term: "Early stopping",
    definition: "Stopping training when the validation loss stops improving, and keeping the parameters from that point.",
    lesson: "training-in-practice",
  },
  {
    id: "double-descent",
    term: "Double descent",
    definition:
      "The observation that as model size or training grows, test error can fall, rise near the point where the model just fits the training data exactly, then fall again as the model grows further.",
    lesson: "training-in-practice",
  },
  {
    id: "hyperparameter",
    term: "Hyperparameter",
    definition:
      "A setting chosen before training rather than learned, such as the learning rate, batch size, model size or amount of regularisation.",
    lesson: "training-in-practice",
  },
  {
    id: "epoch",
    term: "Epoch",
    definition: "One full pass of training over every example in the training set.",
    lesson: "training-in-practice",
  },
];
